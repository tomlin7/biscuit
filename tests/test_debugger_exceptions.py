from biscuit.debugger.exceptions import ExceptionBreakpointController


def test_exception_breakpoint_controller_defaults():
    ctrl = ExceptionBreakpointController()
    assert ctrl.should_break_on_exception(is_uncaught=True) is True
    assert ctrl.should_break_on_exception(is_uncaught=False) is False
    assert ctrl.get_dap_filters() == ["uncaught"]


def test_exception_breakpoint_controller_all():
    ctrl = ExceptionBreakpointController(break_on_uncaught=False, break_on_all=True)
    assert ctrl.should_break_on_exception(is_uncaught=False) is True
    assert ctrl.should_break_on_exception(is_uncaught=True) is True
    assert "all" in ctrl.get_dap_filters()
