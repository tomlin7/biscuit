from unittest.mock import MagicMock
import pytest

from biscuit.editor.breadcrumbs.history_navigation import HistoryNavigation


class TestHistoryNavigation:
    def test_navigation_backward_and_forward(self):
        hn = HistoryNavigation.__new__(HistoryNavigation)
        hn.base = MagicMock()
        hn.left = MagicMock()
        hn.right = MagicMock()

        editor = MagicMock()
        content = MagicMock()
        content.cursor_history = ["1.0", "5.10", "12.0"]
        content.cursor_history_index = 2
        content.text = MagicMock()
        editor.content = content
        hn.base.editorsmanager.active_editor = editor

        # Navigate backward
        hn.go_down()
        assert content.cursor_history_index == 1
        content.text.mark_set.assert_called_with("insert", "5.10")

        # Navigate backward again
        hn.go_down()
        assert content.cursor_history_index == 0
        content.text.mark_set.assert_called_with("insert", "1.0")

        # At start, further backward does nothing
        hn.go_down()
        assert content.cursor_history_index == 0

        # Navigate forward
        hn.go_up()
        assert content.cursor_history_index == 1
        content.text.mark_set.assert_called_with("insert", "5.10")

    def test_record_cursor_position(self):
        from biscuit.editor.text.editor import TextEditor

        te = TextEditor.__new__(TextEditor)
        te.cursor_history = []
        te.cursor_history_index = -1
        te.text = MagicMock()
        te.text.index.return_value = "1.0"

        te.record_cursor_position()
        assert te.cursor_history == ["1.0"]
        assert te.cursor_history_index == 0

        # Same position is not duplicated
        te.record_cursor_position("1.0")
        assert len(te.cursor_history) == 1

        # New position is appended
        te.record_cursor_position("5.0")
        assert te.cursor_history == ["1.0", "5.0"]
        assert te.cursor_history_index == 1
