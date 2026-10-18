from unittest.mock import MagicMock
from biscuit.views.explorer.directorytree import DirectoryTree

def test_preview_file_single_click():
    dt = MagicMock()
    dt.tree.selected_type.return_value = "file"
    dt.tree.selected_path.return_value = "/workspace/main.py"

    DirectoryTree.preview_file(dt, None)
    dt.base.open_editor.assert_called_once_with("/workspace/main.py", preview=True)
