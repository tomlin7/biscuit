import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from biscuit.editor.editorbase import BaseEditor
from biscuit.editor.types import EditorTypes
from biscuit.editor.comment_prefix import register_comment_prefix, get_comment_prefix


class TestBaseEditor:
    def test_init(self, mock_base):
        editor = BaseEditor.__new__(BaseEditor)
        editor.base = mock_base
        editor.path = None
        editor.path2 = None
        editor.editable = True
        editor.showpath = False
        editor.content = None
        editor.diff = False
        editor.run_command_value = ""
        editor.debugger = None
        editor.language = ""
        editor.standalone = False
        editor.minimalist = False
        editor.exists = True
        editor.runmenu = None
        editor.unsupported = False
        editor.content_hash = ""
        editor.text = None
        editor.filename = ""
        editor.__buttons__ = []
        assert editor.path is None
        assert editor.editable is True

    def test_unsaved_changes(self, mock_base):
        editor = BaseEditor.__new__(BaseEditor)
        editor.base = mock_base
        assert editor.unsaved_changes() is None

    def test_breakpoints(self, mock_base):
        editor = BaseEditor.__new__(BaseEditor)
        editor.base = mock_base
        assert editor.breakpoints() is None

    def test_save(self, mock_base):
        editor = BaseEditor.__new__(BaseEditor)
        editor.base = mock_base
        assert editor.save() is None

    def test_new_like_default(self, mock_base):
        editor = BaseEditor.__new__(BaseEditor)
        editor.base = mock_base
        assert editor.new_like(None) is None

    def test_add_button(self, mock_base):
        editor = BaseEditor.__new__(BaseEditor)
        editor.base = mock_base
        editor.__buttons__ = []
        editor.add_button("arg1", "arg2")
        assert len(editor.__buttons__) == 1
        assert editor.__buttons__[0] == ("arg1", "arg2")

    def test_add_button_dict(self, mock_base):
        editor = BaseEditor.__new__(BaseEditor)
        editor.base = mock_base
        editor.__buttons__ = []
        editor.add_button({"key": "value"})
        assert editor.__buttons__[0] == ({"key": "value"},)


def test_register_comment_prefix():
    register_comment_prefix("python", "#")
    assert get_comment_prefix("python") == "#"


def test_get_comment_prefix_nonexistent():
    assert get_comment_prefix("nonexistent_language") is None


def test_register_and_get_multiple():
    register_comment_prefix("cpp", "//")
    register_comment_prefix("javascript", "//")
    register_comment_prefix("python", "#")
    assert get_comment_prefix("cpp") == "//"
    assert get_comment_prefix("javascript") == "//"
    assert get_comment_prefix("python") == "#"


class TestEditorTypes:
    @pytest.fixture
    def editor_types(self, mock_base):
        et = EditorTypes(mock_base)
        return et

    def test_init(self, mock_base):
        et = EditorTypes(mock_base)
        assert et.base == mock_base
        assert et._types == {}

    def test_register_and_get(self, mock_base):
        et = EditorTypes(mock_base)
        editor_cls = MagicMock()
        editor_cls.name = "test_editor"
        et.register(editor_cls)
        assert et.get("test_editor") == editor_cls

    def test_get_nonexistent(self, mock_base):
        et = EditorTypes(mock_base)
        assert et.get("nonexistent") is None

    def test_get_default(self, editor_types):
        editor_types._types["text"] = MagicMock()
        assert editor_types.get_default() == editor_types._types["text"]

    def test_get_default_none(self, editor_types):
        assert editor_types.get_default() is None

    def test_get_all(self, mock_base):
        et = EditorTypes(mock_base)
        e1, e2 = MagicMock(), MagicMock()
        e1.name = "e1"
        e2.name = "e2"
        et.register(e1)
        et.register(e2)
        all_eds = list(et.get_all())
        assert e1 in all_eds
        assert e2 in all_eds

    def test_get_names(self, mock_base):
        et = EditorTypes(mock_base)
        e1 = MagicMock()
        e1.name = "editor1"
        et.register(e1)
        names = list(et.get_names())
        assert "editor1" in names

    def test_get_editor_no_path(self, mock_base):
        et = EditorTypes(mock_base)
        mock_master = MagicMock()
        mock_master.base = mock_base
        with patch("biscuit.editor.types.TextEditor") as mock_te:
            result = et.get_editor(mock_master)
            mock_te.assert_called_once()

    def test_get_editor_markdown(self, mock_base):
        et = EditorTypes(mock_base)
        mock_master = MagicMock()
        mock_master.base = mock_base
        with patch("biscuit.editor.types.MDEditor") as mock_md:
            with patch("os.path.isfile", return_value=True):
                with patch("biscuit.editor.types.is_image", return_value=False):
                    et.get_editor(mock_master, path="test.md")
                    mock_md.assert_called_once()
