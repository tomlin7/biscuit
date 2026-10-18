from biscuit.editor.text.folding import CodeFoldingManager

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
