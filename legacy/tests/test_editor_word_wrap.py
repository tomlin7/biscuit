from unittest.mock import MagicMock
from biscuit.editor.text.text import Text
from biscuit.layout.statusbar.statusbar import Statusbar
from biscuit.commands import Commands

def test_toggle_word_wrap():
    t = MagicMock(spec=Text)
    t.cget.return_value = "none"
    
    res = Text.toggle_word_wrap(t)
    assert res == "word"
    t.configure.assert_called_with(wrap="word")

    t.cget.return_value = "word"
    res2 = Text.toggle_word_wrap(t)
    assert res2 == "none"
    t.configure.assert_called_with(wrap="none")

def test_statusbar_word_wrap():
    sb = MagicMock(spec=Statusbar)
    sb.word_wrap_btn = MagicMock()

    Statusbar.set_word_wrap(sb, "word")
    sb.word_wrap_btn.change_text.assert_called_with("Wrap: On")

    Statusbar.set_word_wrap(sb, "none")
    sb.word_wrap_btn.change_text.assert_called_with("Wrap: Off")

    # Test toggle_word_wrap on statusbar
    sb.base = MagicMock()
    mock_editor = MagicMock()
    mock_editor.content.text.toggle_word_wrap.return_value = "word"
    sb.base.editorsmanager.active_editor = mock_editor

    Statusbar.toggle_word_wrap(sb)
    mock_editor.content.text.toggle_word_wrap.assert_called_once()
    sb.set_word_wrap.assert_called_with("word")

def test_commands_toggle_word_wrap():
    cmds = MagicMock(spec=Commands)
    cmds.base = MagicMock()
    cmds.base.statusbar = MagicMock()

    Commands.toggle_word_wrap(cmds)
    cmds.base.statusbar.toggle_word_wrap.assert_called_once()
