from unittest.mock import MagicMock, patch

from biscuit.extensions.manager import ExtensionManager
from biscuit.views.extensions.extension import ExtensionGUI


class TestExtensionVersionControl:
    def test_version_comparison(self):
        assert ExtensionManager._compare_versions("1.0.0", "0.9.0") > 0
        assert ExtensionManager._compare_versions("0.1.0", "0.1.0") == 0
        assert ExtensionManager._compare_versions("0.1.0", "0.2.0") < 0
        assert ExtensionManager._compare_versions("v1.2.3", "1.2.0") > 0

    def test_check_outdated_extensions(self, mock_base):
        manager = ExtensionManager(mock_base)
        manager.installed = {
            "test_ext": {"name": "Test Extension", "version": "0.1.0"},
            "current_ext": {"name": "Current Extension", "version": "1.0.0"},
        }
        manager.available_extensions = {
            "test_ext": {"name": "Test Extension", "version": "0.2.0"},
            "current_ext": {"name": "Current Extension", "version": "1.0.0"},
        }

        outdated = manager.check_outdated_extensions()
        assert "test_ext" in outdated
        assert "current_ext" not in outdated
        assert outdated["test_ext"]["installed_version"] == "0.1.0"
        assert outdated["test_ext"]["available_version"] == "0.2.0"

    def test_extension_gui_outdated(self, mock_base):
        mock_results = MagicMock()
        mock_results.base = mock_base
        manager = mock_base.extensions_manager
        manager.installed = {
            "my_ext": {"version": "0.1.0"}
        }

        data = {
            "submodule": "my_ext",
            "name": "My Extension",
            "author": "author",
            "description": "desc",
            "version": "0.2.0",
        }

        with patch.object(ExtensionGUI, "installed", True):
            ext_gui = ExtensionGUI(mock_results, "my_ext", data)
            assert ext_gui.installed_version == "0.1.0"
            assert ext_gui.outdated is True
            assert ext_gui.install.text == "Update"

    def test_update_extension_from_name(self, mock_base):
        manager = ExtensionManager(mock_base)
        manager.installed = {
            "my_ext": {"name": "My Extension", "version": "0.1.0"}
        }
        manager.available_extensions = {
            "my_ext": {
                "submodule": "my_ext",
                "name": "My Extension",
                "author": "author",
                "description": "desc",
                "version": "0.2.0",
            }
        }
        manager.update_extension = MagicMock(return_value=None)

        res = manager.update_extension_from_name("my_ext")
        assert res is True
        manager.update_extension.assert_called_once()
