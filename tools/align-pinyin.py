import json
import sys

from pypinyin import pinyin, Style

HANZI_RANGE = ((0x3400, 0x4DBF), (0x4E00, 0x9FFF), (0xF900, 0xFAFF))


def is_hanzi(ch):
    code = ord(ch)
    return any(lo <= code <= hi for lo, hi in HANZI_RANGE)


def align(text):
    out = []
    for ch in text:
        if is_hanzi(ch):
            value = pinyin(ch, style=Style.TONE, heteronym=False, errors="ignore")
            out.append(value[0][0] if value and value[0] else "")
        else:
            out.append("")
    return out


payload = json.load(sys.stdin)
texts = payload["texts"]
json.dump({"aligned": [align(t) for t in texts]}, sys.stdout, ensure_ascii=False)
