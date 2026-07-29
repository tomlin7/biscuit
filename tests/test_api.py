from unittest.mock import MagicMock, patch

import pytest

from biscuit.api.base import ExtensionsAPI
from biscuit.api.commands import Commands as APICommands
from biscuit.api.editors import Editors
from biscuit.api.notifications import Notifications
from biscuit.api.views import Views
from biscuit.api.logger import Logger
from biscuit.api.releases import Releases
from biscuit.api.assistant import Assistant
from biscuit.api.endpoint import Endpoint


class TestExtensionsAPI:
    @pytest.fixture
    def api(self, mock_base):
        mock_base.menubar = MagicMock()
        mock_base.statusbar = MagicMock()
        mock_base.sidebar = MagicMock()
        mock_base.panel = MagicMock()
        mock_base.editorsmanager = MagicMock()
        mock_base.terminalmanager = MagicMock()
        mock_base.language_server_manager = MagicMock()
        mock_base.extensions_manager = MagicMock()
        api = ExtensionsAPI(mock_base)
        return api

    def test_init(self, mock_base):
        mock_base.menubar = MagicMock()
        mock_base.statusbar = MagicMock()
        mock_base.sidebar = MagicMock()
        mock_base.panel = MagicMock()
        mock_base.editorsmanager = MagicMock()
        mock_base.terminalmanager = MagicMock()
        mock_base.language_server_manager = MagicMock()
        mock_base.extensions_manager = MagicMock()
        api = ExtensionsAPI(mock_base)
        assert isinstance(api.commands, APICommands)
        assert isinstance(api.logger, Logger)
        assert isinstance(api.editors, Editors)
        assert isinstance(api.notifications, Notifications)
        assert isinstance(api.views, Views)
        assert isinstance(api.releases, Releases)
        assert isinstance(api.assistant, Assistant)

    def test_register(self, api):
        ext = MagicMock()
        api.register("test_ext", ext)
        api.base.extensions_manager.register_this_installed.assert_called_once_with("test_ext", ext)

    def test_register_extension(self, api):
        ext = MagicMock()
        api.register_extension("test_ext", ext)
        api.base.extensions_manager.register_this_installed.assert_called_once_with("test_ext", ext)

    def test_register_methods_are_callable(self, mock_base):
        mock_base.menubar = MagicMock()
        mock_base.statusbar = MagicMock()
        mock_base.sidebar = MagicMock()
        mock_base.panel = MagicMock()
        mock_base.editorsmanager = MagicMock()
        mock_base.terminalmanager = MagicMock()
        mock_base.language_server_manager = MagicMock()
        mock_base.extensions_manager = MagicMock()
        api = ExtensionsAPI(mock_base)
        assert callable(api.register_comment_prefix)
        assert callable(api.register_game)
        assert callable(api.register_langserver)
        assert callable(api.register_run_command)


class TestAPIEndpoints:
    def test_endpoint_init(self, mock_base):
        ep = Endpoint(mock_base)
        assert ep.base == mock_base

    def test_commands_init(self, mock_base):
        cmd = APICommands(mock_base)
        assert cmd.base == mock_base

    def test_editors_init(self, mock_base):
        ed = Editors(mock_base)
        assert ed.base == mock_base

    def test_notifications_init(self, mock_base):
        n = Notifications(mock_base)
        assert n.base == mock_base
        assert hasattr(n, "info")
        assert hasattr(n, "warning")
        assert hasattr(n, "error")

    def test_views_init(self, mock_base):
        v = Views(mock_base)
        assert v.base == mock_base

    def test_logger_init(self, mock_base):
        l = Logger(mock_base)
        assert l.base == mock_base
        assert hasattr(l, "info")
        assert hasattr(l, "error")

    def test_releases_init(self, mock_base):
        r = Releases(mock_base)
        assert r.base == mock_base

    def test_assistant_init(self, mock_base):
        a = Assistant(mock_base)
        assert a.base == mock_base
