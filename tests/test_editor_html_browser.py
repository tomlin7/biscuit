from unittest.mock import MagicMock, patch
from biscuit.editor.html.editor import HTMLEditor

def test_html_open_in_browser():
    ed = MagicMock(spec=HTMLEditor)
    ed.path = "/tmp/test.html"

    with patch("webbrowser.open_new_tab") as mock_open:
        HTMLEditor.open_in_browser(ed)
        mock_open.assert_called_once_with("file:///tmp/test.html")
