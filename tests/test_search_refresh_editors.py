from unittest.mock import MagicMock
from biscuit.views.search.results import Results

def test_refresh_open_editors_after_replace():
    sr = MagicMock()
    ed1 = MagicMock()
    ed1.path = "/path/to/file.py"
    sr.base.editorsmanager.active_editors = [ed1]

    Results.refresh_open_editors(sr, "/path/to/file.py")
    ed1.reload.assert_called_once()
