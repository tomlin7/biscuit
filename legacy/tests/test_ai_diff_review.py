from biscuit.common.ai.diff_review import DiffReviewManager

def test_diff_review_staging_and_actions():
    mgr = DiffReviewManager()
    edit = mgr.stage_edit("test.py", "def foo(): pass\n", "def foo(): return 42\n")
    assert "test.py" in [e.path for e in mgr.list_pending()]
    assert "+def foo(): return 42" in edit.diff()

    accepted = mgr.accept_edit("test.py")
    assert accepted.path == "test.py"
    assert len(mgr.list_pending()) == 0

    mgr.stage_edit("bar.py", "a = 1\n", "a = 2\n")
    mgr.reject_edit("bar.py")
    assert len(mgr.list_pending()) == 0
