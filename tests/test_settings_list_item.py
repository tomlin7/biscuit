from unittest.mock import MagicMock, patch
from biscuit.settings.editor.items import ListItem


def test_list_item_add_and_remove():
    with patch.object(ListItem, "__init__", lambda self, *a, **kw: None):
        item = ListItem(None)
        item.value = ["*.pyc", "*.git"]
        item.add_entry_var = MagicMock()
        item.callback = MagicMock()
        item.render_rows = MagicMock()
        item.change = lambda: item.callback(item.value) if item.callback else None

        # Add item
        item.add_item("node_modules")
        assert "node_modules" in item.value
        assert len(item.value) == 3
        item.callback.assert_called_with(["*.pyc", "*.git", "node_modules"])

        # Remove item at index 0
        item.remove_item(0)
        assert item.value == ["*.git", "node_modules"]
        item.callback.assert_called_with(["*.git", "node_modules"])
