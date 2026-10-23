from types import SimpleNamespace
from unittest.mock import MagicMock

from biscuit.editor.text.editor import TextEditor
from biscuit.editor.text.minimap import Minimap


def test_minimap_smooth_yview_sync():
    """The minimap slider follows the text viewport fractions."""
    m = MagicMock(spec=Minimap)
    m.cw = MagicMock()
    m.cw.winfo_height.return_value = 500
    m.yvalue = 0

    Minimap.update_from_yview(m, 0.25, 0.75)
    assert m.yvalue == 125
    m.cw.coords.assert_called_with("slider", 0, 125)


def test_redraw_minimap_skips_hidden_editor():
    """Do not redraw the minimap when it is not visible."""
    minimap = MagicMock()
    minimap.winfo_ismapped.return_value = False
    editor = SimpleNamespace(
        _minimap_redraw_job=1,
        minimap=minimap,
        text=MagicMock(),
        winfo_exists=lambda: True,
    )

    TextEditor._redraw_minimap(editor)

    assert editor._minimap_redraw_job is None
    minimap.redraw.assert_not_called()


def test_redraw_minimap_updates_visible_editor():
    """Redraw a visible minimap and synchronize its viewport."""
    minimap = MagicMock()
    minimap.winfo_ismapped.return_value = True
    text = MagicMock()
    text.yview.return_value = (0.25, 0.75)
    editor = SimpleNamespace(
        _minimap_redraw_job=1,
        minimap=minimap,
        text=text,
        winfo_exists=lambda: True,
    )

    TextEditor._redraw_minimap(editor)

    minimap.redraw.assert_called_once()
    minimap.update_from_yview.assert_called_once_with(0.25, 0.75)


def test_schedule_minimap_redraw_replaces_previous_job():
    """Rescheduling replaces and cancels the previous minimap redraw."""
    cancelled = []
    editor = SimpleNamespace(
        _minimap_redraw_job=7,
        after_cancel=cancelled.append,
        after=lambda _delay, _callback: 42,
        _redraw_minimap=lambda: None,
    )

    TextEditor._schedule_minimap_redraw(editor)

    assert cancelled == [7]
    assert editor._minimap_redraw_job == 42
