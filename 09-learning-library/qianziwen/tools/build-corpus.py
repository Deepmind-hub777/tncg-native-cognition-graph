"""Build draft lesson records from the sourced 1,000-character transcription.

Dependencies are generation-only: pypinyin==0.55.0 and
opencc-python-reimplemented==0.1.7. Draft readings are never marked verified.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "work" / ".pydeps"))
from opencc import OpenCC
from pypinyin import Style, lazy_pinyin

ROOT = Path(__file__).resolve().parents[1]
PINYIN_DRAFT_OVERRIDES = {
    # In 「辰宿列張」, 宿 means 星宿 (constellation) and is xiù (MOE 國語辭典簡編本: 星宿、二十八宿 讀 xiù).
    4: ["chén", "xiù", "liè", "zhāng"],
    # In 「露結為霜」, 為 means “become/as” and is wéi, not the default wèi.
    10: ["lù", "jié", "wéi", "shuāng"],
    # In 「靡恃己長」, 長 means “strength/merit” and is cháng (as in 長處), not zhǎng.
    46: ["mǐ", "shì", "jǐ", "cháng"],
    37: ["gài", "cǐ", "shēn", "fà"],
    188: ["qī", "xiè", "huān", "zhāo"],
    # 經 Milo 確認（2026-11-25）：pypinyin 默認讀音在以下三組有誤。
    # 「晉楚更霸」更＝更替、輪流，讀 gēng（非副詞「更加」gèng）。
    143: ["jìn", "chǔ", "gēng", "bà"],
    # 「欣奏累遣」累＝名詞「憂累/負累」，與「慼謝歡招」對舉，讀 lěi（非疲累義 lèi）。
    187: ["xīn", "zòu", "lěi", "qiǎn"],
    # 「永綏吉劭」綏 單音字，讀 suí（無 suī 讀法）。
    242: ["yǒng", "suí", "jí", "shào"],
}
TRADITIONAL_TEXT_OVERRIDES = {
    12: "玉出崑岡",      # Distinguish 崑 from 昆 in 「昆池碣石」.
    37: "蓋此身髮",      # Distinguish 髮 from 發 in 「周發殷湯」.
    41: "女慕貞絜",      # Distinguish 絜 from 潔 in 「紈扇圓潔」.
    154: "百郡秦并",     # Retain the source transcription's distinct 并 form.
    156: "禪主云亭",     # Distinguish 云 from 雲 in 「雲騰致雨」.
    188: "慼謝歡招",     # Distinguish 慼 from 戚 in 「親戚故舊」.
}
source_path = ROOT / "data" / "corpus-source.txt"
lessons_path = ROOT / "data" / "lessons.json"
source_text = "".join(source_path.read_text(encoding="utf-8").split())
if len(source_text) != 1000:
    raise SystemExit(f"expected 1000 source characters, received {len(source_text)}")
if len(source_text) % 4:
    raise SystemExit("source character count is not divisible by four")

to_traditional = OpenCC("s2t")
existing = json.loads(lessons_path.read_text(encoding="utf-8"))
golden = next((item for item in existing if item["sequence"] == 1), None)
if golden is None:
    raise SystemExit("the approved first lesson must be preserved")

def field(value, source):
    return {"value": value, "status": "needs_review", "source": source}

entries = [golden]
for sequence in range(2, 251):
    simplified_text = source_text[(sequence - 1) * 4: sequence * 4]
    traditional_text = TRADITIONAL_TEXT_OVERRIDES.get(sequence, to_traditional.convert(simplified_text))
    syllables = PINYIN_DRAFT_OVERRIDES.get(sequence, lazy_pinyin(traditional_text, style=Style.TONE, errors="default"))
    meaning = "释义待校订"
    meaning_pinyin = ["" if not character.strip() else reading
                      for character, reading in zip(meaning, lazy_pinyin(meaning, style=Style.TONE, errors="default"))]
    codepoints = [f"{ord(character):04X}" for character in traditional_text]
    entries.append({
        "id": f"qzw-{sequence:03d}",
        "sequence": sequence,
        "traditionalText": field(traditional_text, "https://zh.wikisource.org/w/index.php?title=千字文&oldid=13033228; source transcription in data/corpus-source.txt"),
        "pinyin": field(syllables, "Draft generated with pypinyin 0.55.0 plus sequence-specific reading overrides in build-corpus.py; verify against Xinhua Dictionary 13th edition and sentence context."),
        "simplifiedMeaning": field(meaning, "Explanation authoring/review pending; no unverified explanation is presented as fact."),
        "simplifiedMeaningPinyin": field(meaning_pinyin, "Draft pinyin generated with pypinyin 0.55.0; character-aligned, needs review."),
        "englishNote": field("Meaning pending review.", "Original teaching-note placeholder; needs authoring and review."),
        "illustration": field({"path": None, "prompt": f"Create a quiet, text-free ink-wash scene expressing the imagery of {traditional_text}."}, "Image prompt draft only; no image generated; needs review."),
        "audio": field({"normal": None, "slow": None, "characters": [None] * 4}, "Awaiting authorized generated audio assets and manifest entries."),
        "strokeData": field(codepoints, "Hanzi Writer Data 2.0.1 source; verify dataset coverage and stroke order before enabling this character."),
    })

lessons_path.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(entries)} lessons from {len(source_text)} characters; {len(entries) - 1} lesson records remain drafts.")
