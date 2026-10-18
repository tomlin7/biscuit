from unittest.mock import MagicMock
from biscuit.layout.editors.tabscroll import TabScroll

def test_tabscroll_navigation():
    ts = MagicMock(spec=TabScroll)
    ts.master = MagicMock()
    
    TabScroll.scroll_left(ts)
    ts.master.tabs.xview_scroll.assert_called_with(1, "units")

    TabScroll.scroll_right(ts)
    ts.master.tabs.xview_scroll.assert_called_with(-1, "units")
