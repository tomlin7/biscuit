from unittest.mock import MagicMock
from biscuit.layout.editors.pane import EditorPane


def test_pane_tab_reorder_and_scroll(mock_base):
    pane = EditorPane.__new__(EditorPane)
    pane.base = mock_base
    pane.tab_container = MagicMock()

    t1, t2, t3 = MagicMock(), MagicMock(), MagicMock()
    pane.active_tabs = [t1, t2, t3]

    # Reorder t1 from 0 to 2
    pane.reorder_tab(t1, 2)
    assert pane.active_tabs == [t2, t3, t1]

    # Scroll left
    pane.scroll_tabs_left()
    assert pane.active_tabs == [t3, t1, t2]

    # Scroll right
    pane.scroll_tabs_right()
    assert pane.active_tabs == [t2, t3, t1]
