import os
import pytest
from biscuit.common.textutils import (
    get_eol,
    get_eol_label,
    get_default_newline,
    is_text_file,
    eol_map,
    eol_map_rev,
)

def test_eol_mappings():
    assert get_eol("LF") == "\n"
    assert get_eol("CRLF") == "\r\n"
    assert get_eol("CR") == "\r"
    assert get_eol("UNKNOWN") == os.linesep

def test_eol_labels():
    assert get_eol_label("\n") == "LF"
    assert get_eol_label("\r\n") == "CRLF"
    assert get_eol_label("\r") == "CR"
    assert get_eol_label("\t") == "AUTO"

def test_default_newline():
    assert get_default_newline() == os.linesep

def test_is_text_file(tmp_path):
    # Text file test
    txt_file = tmp_path / "test.txt"
    txt_file.write_text("Hello World! This is a plain text file.")
    assert is_text_file(str(txt_file)) is True

    # Empty file test
    empty_file = tmp_path / "empty.txt"
    empty_file.write_bytes(b"")
    assert is_text_file(str(empty_file)) is True

    # Binary file test
    bin_file = tmp_path / "test.bin"
    bin_file.write_bytes(b"\x00\x01\x02\x03\xff\xfe\xfd")
    assert is_text_file(str(bin_file)) is False
