from biscuit.language.sync import compute_incremental_changes

def test_incremental_text_sync():
    old = "def foo():\n    pass\n"
    new = "def foo():\n    return 42\n"
    changes = compute_incremental_changes(old, new)
    assert len(changes) >= 1
    lsp_dict = changes[0].to_lsp_dict()
    assert "range" in lsp_dict
    assert "text" in lsp_dict
