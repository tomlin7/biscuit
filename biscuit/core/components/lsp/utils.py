
import sys
from pathlib import Path
from typing import Iterator
from urllib.request import url2pathname

import sansio_lsp_client as lsp


def stream_to_log(stream, log) -> None:
    for line_bytes in stream:
        line = line_bytes.rstrip(b"\r\n").decode("utf-8", errors="replace")
        log.info(f"langserver logged: {line}")
        

def exit_code_string(exit_code: int) -> str:
    if exit_code >= 0:
        return f"exited with code {exit_code}"

    signal_number = abs(exit_code)
    result = f"was killed by signal {signal_number}"

    try:
        result += f" ({signal_number})"
    except ValueError:
        pass

    return result

def get_completion_item_doc(item: lsp.CompletionItem) -> str:
    if not item.documentation:
        return item.label

    if isinstance(item.documentation, lsp.MarkupContent):
        result = item.documentation.value
    else:
        result = item.documentation

    # try this with clangd
    #
    #    // comment
    #    void foo(int x, char c) { }
    #
    #    int main(void)
    #    {
    #        fo<Tab>
    #    }
    if not completion_item_doc_contains_label(result, item.label):
        result = item.label.strip() + "\n\n" + result
    return result

def completion_item_doc_contains_label(doc: str, label: str) -> bool:
    # this used to be doc.startswith(label), but see issue #67
    label = label.strip()
    if "(" in label:
        prefix = label.strip().split("(")[0] + "("
    else:
        prefix = label.strip()
    return doc.startswith(prefix)


def _get_diagnostic_string(diagnostic: lsp.Diagnostic) -> str:
    if diagnostic.source is None:
        assert diagnostic.message is not None  # TODO
        return diagnostic.message
    return f"{diagnostic.source}: {diagnostic.message}"

# There doesn't seem to be standard library trick that works in all cases
# https://stackoverflow.com/q/5977576
def _file_url_to_path(file_url: str) -> Path:
    assert file_url.startswith("file://")

    if sys.platform == "win32":
        if file_url.startswith("file:///"):
            # File on this computer: 'file:///C:/Users/Akuli/Foo%20Bar.txt'
            return Path(url2pathname(file_url[8:]))
        else:
            # Network share: 'file://Server2/Share/Test/Foo%20Bar.txt'
            return Path(url2pathname(file_url[5:]))
    else:
        # 'file:///home/akuli/foo%20bar.txt'
        return Path(url2pathname(file_url[7:]))


def _get_jump_paths_and_ranges(
    locations: list[lsp.Location | lsp.LocationLink] | lsp.Location | None,
) -> Iterator[tuple[Path, lsp.Range]]:
    if locations is None:
        locations = []
    if not isinstance(locations, list):
        locations = [locations]

    for location in locations:
        assert not isinstance(location, lsp.LocationLink)  # TODO
        yield (_file_url_to_path(location.uri), location.range)

def _get_hover_string(
    hover_contents: list[lsp.MarkedString | str] | lsp.MarkedString | lsp.MarkupContent | str,
) -> str:
    if isinstance(hover_contents, (lsp.MarkedString, lsp.MarkupContent)):
        return hover_contents.value
    if isinstance(hover_contents, list):
        return "\n\n".join(_get_hover_string(item) for item in hover_contents)
    return hover_contents

def _position_tk2lsp(tk_position: str | list[int]) -> lsp.Position:
    # this can't use tab.index, because it needs to handle text
    # locations that don't exist anymore when text has been deleted
    if isinstance(tk_position, str):
        line, column = map(int, tk_position.split("."))
    else:
        line, column = tk_position

    # lsp line numbering starts at 0
    # tk line numbering starts at 1
    # both column numberings start at 0
    return lsp.Position(line=line - 1, character=column)


CHUNK_SIZE = 64 * 1024

def _position_lsp2tk(lsp_position: lsp.Position) -> str:
    return f"{lsp_position.line + 1}.{lsp_position.character}"