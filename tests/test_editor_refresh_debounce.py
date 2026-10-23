from types import SimpleNamespace
from unittest.mock import MagicMock

from biscuit.editor.text.editor import TextEditor
from biscuit.editor.text.text import Text


def make_text(highlighter, edit_infos, force_full=False):
    """Create a minimal Text double for testing refresh()."""
    text = MagicMock()
    text.master = MagicMock()
    text.highlighter = highlighter
    text._pending_edit_infos = edit_infos
    text._force_full_highlight = force_full
    text.minimalist = True
    return text


def test_refresh_batches_pending_edits():
    """Pending edits are applied through the batch highlighter once."""
    highlighter = MagicMock()
    infos = [{"op": "insert"}, {"op": "delete"}]
    text = make_text(highlighter, infos)

    Text.refresh(text)

    highlighter.incremental_highlight_many.assert_called_once_with(infos)
    assert text._pending_edit_infos == []
    text.master.cancel_text_refresh.assert_called_once()


def test_refresh_uses_full_highlight_when_forced():
    """A forced refresh reparses the whole document and discards queued edits."""
    highlighter = MagicMock()
    text = make_text(highlighter, [{"op": "insert"}], force_full=True)

    Text.refresh(text)

    highlighter.highlight.assert_called_once()
    highlighter.incremental_highlight_many.assert_not_called()
    assert text._force_full_highlight is False
    assert text._pending_edit_infos == []


def test_refresh_uses_full_highlight_without_edits():
    """A refresh with no queued edits performs a full highlight."""
    highlighter = MagicMock()
    text = make_text(highlighter, [])

    Text.refresh(text)

    highlighter.highlight.assert_called_once()
    highlighter.incremental_highlight_many.assert_not_called()


def test_refresh_falls_back_to_individual_edits():
    """Older highlighters receive each queued edit separately."""
    highlighter = MagicMock(spec=["highlight", "incremental_highlight"])
    infos = [{"op": "insert"}, {"op": "delete"}]
    text = make_text(highlighter, infos)

    Text.refresh(text)

    assert highlighter.incremental_highlight.call_count == 2
    highlighter.highlight.assert_not_called()


def test_refresh_falls_back_to_full_highlight():
    """Highlighters without incremental support reparse the whole document."""
    highlighter = MagicMock(spec=["highlight"])
    text = make_text(highlighter, [{"op": "insert"}])

    Text.refresh(text)

    highlighter.highlight.assert_called_once()


def test_schedule_text_refresh_replaces_previous_job():
    """Scheduling a refresh cancels the previous pending job."""
    cancelled = []
    editor = SimpleNamespace(
        cancel_text_refresh=lambda: cancelled.append(True),
        after=lambda _delay, _callback: 42,
        _refresh_text=lambda: None,
    )

    TextEditor._schedule_text_refresh(editor)

    assert cancelled == [True]
    assert editor._text_refresh_job == 42


def test_cancel_text_refresh_cancels_pending_job():
    """Cancelling a pending refresh clears the scheduled job id."""
    cancelled = []
    editor = SimpleNamespace(
        _text_refresh_job=7,
        after_cancel=cancelled.append,
    )

    TextEditor.cancel_text_refresh(editor)

    assert cancelled == [7]
    assert editor._text_refresh_job is None


def test_cancel_text_refresh_without_job_is_noop():
    """Cancelling without a pending job does not call after_cancel."""
    cancelled = []
    editor = SimpleNamespace(
        _text_refresh_job=None,
        after_cancel=cancelled.append,
    )

    TextEditor.cancel_text_refresh(editor)

    assert cancelled == []


def test_refresh_text_calls_refresh_when_visible():
    """The debounced callback refreshes an existing editor."""
    text = MagicMock()
    editor = SimpleNamespace(
        _text_refresh_job=1,
        winfo_exists=lambda: True,
        text=text,
    )

    TextEditor._refresh_text(editor)

    assert editor._text_refresh_job is None
    text.refresh.assert_called_once()


def test_refresh_text_skips_destroyed_editor():
    """The debounced callback does nothing after the editor is destroyed."""
    text = MagicMock()
    editor = SimpleNamespace(
        _text_refresh_job=1,
        winfo_exists=lambda: False,
        text=text,
    )

    TextEditor._refresh_text(editor)

    text.refresh.assert_not_called()


def test_refresh_text_swallows_refresh_errors():
    """The debounced callback must not propagate refresh failures."""
    text = MagicMock()
    text.refresh.side_effect = RuntimeError("boom")
    editor = SimpleNamespace(
        _text_refresh_job=1,
        winfo_exists=lambda: True,
        text=text,
    )

    TextEditor._refresh_text(editor)

    text.refresh.assert_called_once()
