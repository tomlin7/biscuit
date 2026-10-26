from unittest.mock import MagicMock
from biscuit.editor.text.folding import CodeFoldingManager
from biscuit.editor.text.linenumbers import LineNumbers
from biscuit.editor.text.text import Text

def test_code_folding():
    mgr = CodeFoldingManager()
    mgr.add_fold(10, 25)
    assert not mgr.is_line_folded(10)

    folded = mgr.toggle_fold(10)
    assert folded is True
    assert mgr.is_line_folded(10)

    lines = [
        "def test():",
        "    a = 1",
        "    b = 2",
        "def another():",
    ]
    folds = mgr.compute_indent_folds(lines)
    assert len(folds) >= 1
    assert folds[0] == (1, 3)

def test_linenumbers_folding_integration():
    ln = MagicMock(spec=LineNumbers)
    ln.folding_manager = CodeFoldingManager()
    ln.text = MagicMock(spec=Text)
    ln.master = MagicMock()

    ln.folding_manager.add_fold(5, 15)

    is_folded = LineNumbers.toggle_fold(ln, 5)
    assert is_folded is True
    assert LineNumbers.is_line_folded(ln, 5) is True
    ln.text.tag_config.assert_called_with("fold_5", elide=True)
    ln.text.tag_add.assert_called_with("fold_5", "6.0", "16.0")

    unfolded = LineNumbers.toggle_fold(ln, 5)
    assert unfolded is False
    assert LineNumbers.is_line_folded(ln, 5) is False
    ln.text.tag_remove.assert_called_with("fold_5", "1.0", "end")

def test_text_folding_delegation():
    text = MagicMock(spec=Text)
    text.master = MagicMock()
    text.master.linenumbers = MagicMock(spec=LineNumbers)
    text.master.linenumbers.toggle_fold.return_value = True
    text.master.linenumbers.is_line_folded.return_value = True

    assert Text.toggle_fold(text, 5) is True
    text.master.linenumbers.toggle_fold.assert_called_with(5)

    assert Text.is_line_folded(text, 5) is True
    text.master.linenumbers.is_line_folded.assert_called_with(5)
