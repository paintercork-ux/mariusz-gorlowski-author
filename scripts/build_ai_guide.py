"""Import the approved bilingual AI guide from its editorial workspace."""

import argparse
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile


SITE = Path(__file__).resolve().parents[1]
CHAPTER_IDS = (
    "intro", "history", "basics", "hardware", "training",
    "people", "curiosities", "conversation", "prompts", "risks",
)
EDITIONS = {
    "pl": ("parts", "Źródła", "work/revised-pl/AI_W_PIGULCE_REKOPIS_PL_2026-11-20.docx"),
    "en": ("parts-en", "Sources", "work/edited-en/AI_IN_A_NUTSHELL_EN_2026-11-20.docx"),
}
WORD_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
WORD_VAL = f"{{{WORD_NS['w']}}}val"


def read_book_titles(document):
    with ZipFile(document) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    title = {}
    chapters = []
    for paragraph in root.findall("./w:body/w:p", WORD_NS):
        style = paragraph.find("./w:pPr/w:pStyle", WORD_NS)
        if style is None:
            continue
        kind = style.get(WORD_VAL)
        value = "".join(node.text or "" for node in paragraph.findall(".//w:t", WORD_NS))
        if kind in ("Title", "Subtitle"):
            title[kind.lower()] = value
        elif kind == "Heading1":
            chapters.append(value)
    return title, chapters


def read_chapter(path, chapter_id, title, sources_label):
    original_heading, body = path.read_text(encoding="utf-8").split("\n", 1)
    if not original_heading.startswith("## "):
        raise ValueError(f"Missing chapter heading in {path}")
    prose, _, bibliography = body.partition(f"\n#### {sources_label}\n")
    chapter = {"id": chapter_id, "title": title, "intro": [], "sections": [], "sources": []}
    blocks = chapter["intro"]
    for raw in prose.splitlines():
        line = raw.strip()
        if not line or line == "---":
            continue
        if line.startswith("### "):
            section = {
                "id": f"{chapter_id}-{len(chapter['sections']) + 1}",
                "title": line[4:],
                "blocks": [],
            }
            chapter["sections"].append(section)
            blocks = section["blocks"]
            continue
        kind = "paragraph"
        if line.startswith("> "):
            kind, line = "quote", line[2:]
        elif line.startswith(("- ", "* ")):
            kind, line = "list", line[2:]
        blocks.append({"type": kind, "text": line})

    for line in bibliography.strip().splitlines():
        if not line.strip():
            continue
        source = re.fullmatch(r"(\d+)\.\s+(.+)", line.strip())
        if not source:
            raise ValueError(f"Invalid bibliography entry in {path}: {line}")
        number, text = source.groups()
        chapter["sources"].append({"number": int(number), "text": text})
    return chapter


def read_edition(workspace, directory, sources_label, document):
    title, chapters = read_book_titles(workspace / document)
    paths = sorted((workspace / directory).glob("*.md"))
    if [path.name[:2] for path in paths] != [f"{n:02}" for n in range(len(CHAPTER_IDS))]:
        raise ValueError(f"Unexpected set of chapters in {workspace / directory}")
    if len(chapters) != len(CHAPTER_IDS) + 1 or chapters[-1] != sources_label:
        raise ValueError(f"Unexpected chapter headings in {document}")
    return {
        **title,
        "chapters": [
            read_chapter(path, chapter_id, chapter_title, sources_label)
            for path, chapter_id, chapter_title in zip(paths, CHAPTER_IDS, chapters[:-1])
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path, help="directory containing the guide manuscripts")
    options = parser.parse_args()
    editions = {
        language: read_edition(options.workspace, *edition)
        for language, edition in EDITIONS.items()
    }
    target = SITE / "data/ai-guide.json"
    target.write_text(json.dumps(editions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Bilingual AI guide data generated.")


if __name__ == "__main__":
    main()
