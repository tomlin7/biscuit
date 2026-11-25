from biscuit.git.gutter import GitGutterController

def test_git_gutter_indicators():
    ctrl = GitGutterController()
    ctrl.set_line_diffs(added=[1, 2], modified=[5], deleted=[10])
    assert ctrl.get_mark_color(1) == "#28a745"
    assert ctrl.get_mark_color(5) == "#007acc"
    assert ctrl.get_mark_color(10) == "#d73a49"
    assert ctrl.get_mark_color(99) == ""
