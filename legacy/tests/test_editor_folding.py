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

def test_compute_indent_folds_blank_lines_and_stubs():
    mgr = CodeFoldingManager()
    # Stub should not fold
    assert mgr.compute_indent_folds(["def stub():", "def next():"]) == []

    # Blank lines between header and indented block
    lines = [
        "def foo():",
        "",
        "    x = 1",
        "def bar():",
    ]
    folds = mgr.compute_indent_folds(lines)
    assert len(folds) == 1
    assert folds[0] == (1, 3)

def test_linenumbers_redraw_skips_elided_lines():
    ln = MagicMock(spec=LineNumbers)
    ln.text = MagicMock(spec=Text)
    ln.winfo_height.return_value = 400
    ln.breakpoints = set()
    ln.folding_manager = CodeFoldingManager()
    ln.font = ("Consolas", 11)
    ln.fg = "#fff"
    ln.hfg = "#fff"
    ln.bg = "#000"
    ln.bp_enabled_color = "red"

    # Line 1 is visible, line 2 is elided (height=0), line 3 is visible
    ln.text.index.side_effect = lambda arg: {
        "@0,0": "1.0",
        "1.0+1line": "2.0",
        "2.0+1line": "3.0",
        "3.0+1line": "4.0",
        "end": "4.0",
        "@0,400": "4.0",
        "insert": "1.0",
    }.get(arg, "1.0")

    ln.text.dlineinfo.side_effect = lambda idx: {
        "1.0": (2, 2, 50, 16, 12),
        "2.0": (2, 18, 0, 0, 0),       # elided!
        "3.0": (2, 18, 50, 16, 12),
        "insert": (2, 2, 50, 16, 12),
    }.get(idx, None)

    created_line_numbers = []
    def fake_create_text(x, y, **kwargs):
        if "text" in kwargs and isinstance(kwargs["text"], int):
            created_line_numbers.append(kwargs["text"])
        return 1

    ln.create_text.side_effect = fake_create_text
    ln.text.relative_line_numbers = False
    ln.text.compare.return_value = False

    LineNumbers.redraw(ln)
    # Line 2 was elided, so it must NOT be drawn in created_line_numbers
    assert 1 in created_line_numbers
    assert 2 not in created_line_numbers
    assert 3 in created_line_numbers
