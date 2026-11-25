from biscuit.views.explorer.nesting import FileNestingController

def test_file_nesting_patterns():
    ctrl = FileNestingController()
    assert ctrl.should_nest_under("app.js", "app.ts") is True
    assert ctrl.should_nest_under("app.d.ts", "app.ts") is True
    assert ctrl.should_nest_under("server.pyc", "server.py") is True
    assert ctrl.should_nest_under("other.js", "app.ts") is False
