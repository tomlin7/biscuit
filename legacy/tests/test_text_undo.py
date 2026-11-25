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
        _pending_edit_infos=[{"op": "insert"}],
        _force_full_highlight=False,
        _line_byte_starts=[0],
        event_generate=lambda *args, **kwargs: events.append((args, kwargs)),
        _notify_lsp_change=lambda: notifications.append(True),
    )

    Text._after_undo_redo(text)

    assert text._pending_edit_infos == []
    assert text._force_full_highlight is True
    assert text._line_byte_starts is None
    assert events == [(("<<Change>>",), {"when": "tail"})]
    assert notifications == [True]
