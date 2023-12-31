import sys
from pathlib import Path
from typing import Iterator, Optional
from urllib.request import url2pathname

import sansio_lsp_client as lsp


def get_completion_item_doc(item: lsp.CompletionItem) -> str:
    if not item.documentation:
        return item.label
    if isinstance(item.documentation, lsp.MarkupContent):
        return item.label + "\n" + item.documentation.value
    return item.label + "\n" + item.documentation

def decode_path_uri(file_url: str) -> Path:
    if sys.platform == "win32":
        if file_url.startswith("file:///"):
            return Path(url2pathname(file_url[8:]))
        else:
            return Path(url2pathname(file_url[5:]))
    else:
        return Path(url2pathname(file_url[7:]))


def jump_paths_and_ranges(locations: list[lsp.Location] | lsp.Location) -> Iterator[tuple[Path, lsp.Range]]:
    if not locations:
        locations = []
    if not isinstance(locations, list):
        locations = [locations]

    for location in locations:
        yield (decode_path_uri(location.uri), location.range)

def hover_filter(content: lsp.MarkupContent | str) -> list[Optional[list[str, str]], str]:
    if not isinstance(content, lsp.MarkupContent):
        return
    
    value = content.value.strip()
    if value.startswith("```"):
        value = [i.strip() for i in value[3:].split("```", 1)]
        return value[0].split("\n"), value[1]

    return None, value

def encode_position(pos: str | list[int]) -> lsp.Position:
    if isinstance(pos, str):
        line, column = map(int, pos.split("."))
    else:
        line, column = pos
    return lsp.Position(line=line - 1, character=column)

def decode_position(pos: lsp.Position) -> str:
    return f"{pos.line + 1}.{pos.character}"
