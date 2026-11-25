from unittest.mock import MagicMock, patch
import pytest

from biscuit.views.extensions.installed import Installed


def test_installed_tab_methods():
    with patch.object(Installed, "__init__", lambda self, master, *a, **kw: None):
        installed = Installed(None)
        installed.title = "Installed"
        installed.extension_list = MagicMock()
        installed.extension_list.items = []

        item = MagicMock()
        installed.add_extension(item)
        installed.extension_list.add.assert_called_once_with(item, fill="x")

        installed.extension_list.items.append(item)
        installed.clear()
        assert len(installed.extension_list.items) == 0
        item.destroy.assert_called_once()
