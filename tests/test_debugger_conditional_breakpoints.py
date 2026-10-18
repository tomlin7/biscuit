from biscuit.debugger.breakpoints import Breakpoint, BreakpointManager


def test_standard_breakpoint():
    mgr = BreakpointManager()
    mgr.set_breakpoint("test.py", 10)
    assert mgr.get_lines("test.py") == {10}
    assert mgr.should_pause_at("test.py", 10) is True


def test_conditional_breakpoint():
    mgr = BreakpointManager()
    mgr.set_breakpoint("test.py", 20, condition="x > 5")

    assert mgr.should_pause_at("test.py", 20, {"x": 3}) is False
    assert mgr.should_pause_at("test.py", 20, {"x": 6}) is True


def test_hit_count_breakpoint():
    mgr = BreakpointManager()
    mgr.set_breakpoint("test.py", 30, hit_condition=3)

    assert mgr.should_pause_at("test.py", 30) is False  # 1st hit
    assert mgr.should_pause_at("test.py", 30) is False  # 2nd hit
    assert mgr.should_pause_at("test.py", 30) is True   # 3rd hit
