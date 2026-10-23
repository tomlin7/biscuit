import tkinter as tk
from types import SimpleNamespace

from biscuit.editor.text.text import Text


def test_stack_undo_delegates_to_native_undo():
    """The legacy stack_undo entry point uses native undo."""
    calls = []
    text = SimpleNamespace(edit_undo=lambda: calls.append("undo"))

    Text.stack_undo(text)

    assert calls == ["undo"]


def test_stack_redo_delegates_to_native_redo():
    """The legacy stack_redo entry point uses native redo."""
    calls = []
    text = SimpleNamespace(edit_redo=lambda: calls.append("redo"))

    Text.stack_redo(text)

    assert calls == ["redo"]


def test_after_undo_redo_clears_pending_edit_and_notifies():
    """Undo/redo invalidates queued incremental edits and emits a change."""
    events = []
    notifications = []
    text = SimpleNamespace(
        _pending_edit_info={"op": "insert"},
        event_generate=lambda *args, **kwargs: events.append((args, kwargs)),
        _notify_lsp_change=lambda: notifications.append(True),
    )

    Text._after_undo_redo(text)

    assert text._pending_edit_info is None
    assert events == [(("<<Change>>",), {"when": "tail"})]
    assert notifications == [True]


class FakeTk:
    """Record Tcl calls and optionally raise an empty-stack error."""

    def __init__(self, error=False):
        """Initialize the fake Tcl interpreter."""
        self.calls = []
        self.error = error

    def call(self, *args):
        """Record a Tcl call and raise when configured to."""
        self.calls.append(args)
        if self.error:
            raise tk.TclError("empty stack")
        return ""


def make_native_text(error=False):
    """Build an uninitialized Text object with enough state for undo tests."""
    text = Text.__new__(Text)
    text.tk = FakeTk(error)
    text._w = "text"
    text._pending_edit_info = {"op": "insert"}
    text.events = []
    text.notifications = []
    text.event_generate = lambda *args, **kwargs: text.events.append((args, kwargs))
    text._notify_lsp_change = lambda: text.notifications.append(True)
    return text


def test_edit_undo_uses_native_stack():
    """edit_undo delegates to the widget and refreshes editor state."""
    text = make_native_text()

    Text.edit_undo(text)

    assert text.tk.calls == [("text", "edit", "undo")]
    assert text._pending_edit_info is None
    assert text.events == [(("<<Change>>",), {"when": "tail"})]
    assert text.notifications == [True]


def test_edit_redo_uses_native_stack():
    """edit_redo delegates to the widget and refreshes editor state."""
    text = make_native_text()

    Text.edit_redo(text)

    assert text.tk.calls == [("text", "edit", "redo")]
    assert text._pending_edit_info is None
    assert text.events == [(("<<Change>>",), {"when": "tail"})]
    assert text.notifications == [True]


def test_edit_undo_ignores_empty_stack():
    """An empty native undo stack is a no-op."""
    text = make_native_text(error=True)

    Text.edit_undo(text)

    assert text.events == []
    assert text.notifications == []
