import os
import tempfile
from unittest.mock import patch

import pytest

from biscuit.common.classdrill import (
    command_palette_ignore,
    extract_commands,
    formalize_command,
)
from biscuit.common.helpers import (
    caller_name,
    caller_class_name,
    check_python_installation,
    get_file_type,
    is_image,
    search_google,
)
from biscuit.common import textutils


class TestTextUtils:
    def test_get_eol_lf(self):
        assert textutils.get_eol("LF") == "\n"

    def test_get_eol_crlf(self):
        assert textutils.get_eol("CRLF") == "\r\n"

    def test_get_eol_cr(self):
        assert textutils.get_eol("CR") == "\r"

    def test_get_eol_unknown(self):
        result = textutils.get_eol("unknown")
        assert result == os.linesep

    def test_get_eol_label_lf(self):
        assert textutils.get_eol_label("\n") == "LF"

    def test_get_eol_label_crlf(self):
        assert textutils.get_eol_label("\r\n") == "CRLF"

    def test_get_eol_label_cr(self):
        assert textutils.get_eol_label("\r") == "CR"

    def test_get_eol_label_unknown(self):
        assert textutils.get_eol_label("?") == "AUTO"

    def test_get_default_newline(self):
        assert textutils.get_default_newline() == os.linesep

    def test_is_text_file_utf8(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt") as f:
            f.write("Hello, world!\nThis is a text file.\n")
            path = f.name
        try:
            assert textutils.is_text_file(path) is True
        finally:
            os.unlink(path)

    def test_is_text_file_binary(self):
        with tempfile.NamedTemporaryFile(mode="wb", delete=False, suffix=".bin") as f:
            f.write(b"\x00\x01\x02\x03\xff\xfe\xfd\xfc")
            path = f.name
        try:
            assert textutils.is_text_file(path) is False
        finally:
            os.unlink(path)

    def test_is_text_file_empty(self):
        with tempfile.NamedTemporaryFile(delete=False) as f:
            path = f.name
        try:
            assert textutils.is_text_file(path) is True
        finally:
            os.unlink(path)

    def test_eol_map_rev(self):
        assert textutils.eol_map_rev["\n"] == "LF"
        assert textutils.eol_map_rev["\r\n"] == "CRLF"


class TestClassDrill:
    def test_formalize_command(self):
        assert formalize_command("open_file") == "Open file"
        assert formalize_command("new_window") == "New window"
        assert formalize_command("quit") == "Quit"

    def test_command_palette_ignore(self):
        @command_palette_ignore
        def some_method():
            pass
        assert some_method._ignored is True

    def test_extract_commands(self):
        class FakeCommands:
            def open_file(self):
                pass

            def save(self):
                pass

            @command_palette_ignore
            def hidden(self):
                pass

            def __private_dunder(self):
                pass

        result = extract_commands(FakeCommands())
        names = [name for name, _ in result]
        assert "open_file" in names
        assert "save" in names
        assert "hidden" not in names
        assert "__private_dunder" not in names


class TestHelpers:
    def test_caller_name(self):
        name = caller_name()
        assert isinstance(name, str)

    def test_caller_class_name_returns_string(self):
        result = caller_class_name()
        assert result is None or isinstance(result, str)

    def test_is_image(self):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as f:
            f.write(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82")
            path = f.name
        try:
            assert is_image(path) is True
        finally:
            os.unlink(path)

    def test_is_image_not_image(self):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as f:
            f.write(b"hello")
            path = f.name
        try:
            assert is_image(path) is False
        finally:
            os.unlink(path)

    def test_get_file_type(self):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as f:
            f.write(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR")
            path = f.name
        try:
            ft = get_file_type(path)
            assert ft is not None
        finally:
            os.unlink(path)

    def test_get_file_type_unknown(self):
        with tempfile.NamedTemporaryFile(delete=False) as f:
            path = f.name
        try:
            assert get_file_type(path) is None
        finally:
            os.unlink(path)

    @patch("biscuit.common.helpers.webbrowser")
    def test_search_google(self, mock_webbrowser):
        search_google("test query")
        mock_webbrowser.open.assert_called_once_with(
            "https://www.google.com/search?q=test query"
        )

    @patch("biscuit.common.helpers.webbrowser")
    def test_search_google_special_chars(self, mock_webbrowser):
        search_google("hello world")
        mock_webbrowser.open.assert_called_once()

    @patch("biscuit.common.helpers.sp.check_call")
    def test_check_python_installation_windows(self, mock_check_call):
        with patch("biscuit.common.helpers.os.name", "nt"):
            check_python_installation()
            mock_check_call.assert_called_once_with(["python", "--version"])

    @patch("biscuit.common.helpers.sp.check_call")
    def test_check_python_installation_linux(self, mock_check_call):
        with patch("biscuit.common.helpers.os.name", "posix"):
            check_python_installation()
            mock_check_call.assert_called_once_with(["python3", "--version"])

    @patch("biscuit.common.helpers.sp.check_call", side_effect=FileNotFoundError)
    @patch("biscuit.common.helpers.webbrowser")
    @patch("biscuit.common.helpers.messagebox")
    def test_check_python_not_installed(self, mock_msg, mock_web, mock_check):
        with patch("biscuit.common.helpers.os.name", "nt"):
            with pytest.raises(SystemExit):
                check_python_installation()
            mock_msg.showerror.assert_called_once()
