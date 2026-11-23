#!/usr/bin/env python3
"""打包《千字文》互动学习模块的可交付版本。

可复现约定：
- 按相对路径排序写入，条目时间戳固定为 RELEASE_EPOCH，同一输入必得同一 zip；
- zip 内附 RELEASE-MANIFEST.sha256（逐文件 sha256 + 字节数），不含清单自身；
- 输出到仓库外可见的 outputs/ 目录，并把总 sha256、文件数、字节数打印出来，
  由 RELEASE.md 记录（脚本不自动改文档，避免数字与磁盘脱节）。

用法：python tools/package_release.py [--out ../outputs] [--name qzw-v0.1-base.zip] [--version qzw-v0.1-base]
"""
from __future__ import annotations

import argparse
import hashlib
import os
import sys
import zipfile
from pathlib import Path

MODULE = Path(__file__).resolve().parent.parent
RELEASE_EPOCH = (2026, 11, 23, 0, 0, 0)

# 交付内容：能直接跑起来的静态站点 + 数据 + 资产 + 可审计工具与文档
INCLUDE_DIRS = ["src", "site", "data", "assets", "vendor", "tools", "tests", "handoff", "docs"]
INCLUDE_FILES = [
    "index.html",
    "styles.css",
    "README.md",
    "HANDOFF.md",
    "CODEX_TASK.md",
    "CODEX_TASK_ILLUSTRATIONS.md",
    "THIRD_PARTY_NOTICES.md",
    "requirements-corpus.txt",
]
# 说明：RELEASE.md 故意不进包——它记录包本身的 sha256，进包会形成自指。
# 版本记录随仓库提交与标签发布，包内只带 README / HANDOFF / 任务书。
EXCLUDE_NAMES = {".DS_Store", "Thumbs.db"}
EXCLUDE_SUFFIXES = {".tmp", ".log", ".lock"}
EXCLUDE_DIRS = {"outputs", "node_modules", "test-results", "playwright-report", "__pycache__", "superpowers"}


def iter_files() -> list[tuple[str, Path]]:
    entries: list[tuple[str, Path]] = []
    for name in INCLUDE_FILES:
        path = MODULE / name
        if path.is_file():
            entries.append((name, path))
    for folder in INCLUDE_DIRS:
        root = MODULE / folder
        if not root.is_dir():
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = sorted(d for d in dirnames if d not in EXCLUDE_DIRS)
            for filename in sorted(filenames):
                if filename in EXCLUDE_NAMES or Path(filename).suffix in EXCLUDE_SUFFIXES:
                    continue
                path = Path(dirpath) / filename
                entries.append((path.relative_to(MODULE).as_posix(), path))
    entries.sort(key=lambda item: item[0])
    return entries


def sha256_of(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(MODULE.parent.parent / "outputs"))
    parser.add_argument("--name", default="qzw-v0.1-base.zip")
    parser.add_argument("--version", default="qzw-v0.1-base")
    args = parser.parse_args()

    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    zip_path = out_dir / args.name

    entries = iter_files()
    if not entries:
        print("没有可打包的文件", file=sys.stderr)
        return 1

    manifest_lines = []
    total_bytes = 0
    for relative, path in entries:
        data = path.read_bytes()
        total_bytes += len(data)
        manifest_lines.append(f"{sha256_of(data)}  {len(data)}  {relative}")

    manifest = (f"# 千字文互动学习 {args.version} 交付清单\n"
                "# 行格式：sha256  字节数  相对路径\n"
                + "\n".join(manifest_lines) + "\n").encode("utf-8")

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for relative, path in entries:
            info = zipfile.ZipInfo(relative, date_time=RELEASE_EPOCH)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())
        info = zipfile.ZipInfo("RELEASE-MANIFEST.sha256", date_time=RELEASE_EPOCH)
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, manifest)

    with zip_path.open("rb") as handle:
        digest = hashlib.sha256()
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    zip_bytes = zip_path.stat().st_size

    print(f"package      {zip_path}")
    print(f"entries      {len(entries)} files (+1 manifest)")
    print(f"content      {total_bytes} bytes")
    print(f"zip          {zip_bytes} bytes")
    print(f"sha256       {digest.hexdigest()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

