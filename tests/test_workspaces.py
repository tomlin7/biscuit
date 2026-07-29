import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest
import toml

from biscuit.workspaces.loader import WorkspaceLoader
from biscuit.workspaces.manager import WorkspaceManager
from biscuit.workspaces.workspace import Workspace


class TestWorkspace:
    def test_init(self):
        loader = MagicMock()
        w = Workspace(loader, "/path/to/workspace.toml", ["/dir1", "/dir2"])
        assert w.path == "/path/to/workspace.toml"
        assert w.dirs == ["/dir1", "/dir2"]

    def test_add_dir(self):
        loader = MagicMock()
        w = Workspace(loader, "/path/ws.toml", ["/dir1"])
        w.add_dir("/dir2")
        assert w.dirs == ["/dir1", "/dir2"]
        loader.dump_modified.assert_called_once_with("/path/ws.toml", ["/dir1", "/dir2"])

    def test_export(self):
        loader = MagicMock()
        w = Workspace(loader, "/path", ["/a", "/b"])
        assert w.export() == {"dirs": ["/a", "/b"]}


class TestWorkspaceLoader:
    @pytest.fixture
    def workspace_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            yield tmpdir

    def test_init(self, mock_base):
        mgr = MagicMock()
        mgr.base = mock_base
        loader = WorkspaceLoader(mgr)
        assert loader.manager == mgr
        assert loader.base == mock_base

    def test_load(self, mock_base, workspace_dir):
        ws_path = os.path.join(workspace_dir, "test.toml")
        with open(ws_path, "w") as f:
            toml.dump({"dirs": ["/dir1", "/dir2"]}, f)
        mgr = MagicMock()
        mgr.base = mock_base
        loader = WorkspaceLoader(mgr)
        loader.load(ws_path)
        mgr.set_workspace.assert_called_once()
        ws = mgr.set_workspace.call_args[0][0]
        assert ws.dirs == ["/dir1", "/dir2"]

    def test_dump_modified(self, workspace_dir):
        path = os.path.join(workspace_dir, "test.toml")
        mgr = MagicMock()
        loader = WorkspaceLoader(mgr)
        loader.dump_modified(path, ["/a", "/b"])
        with open(path) as f:
            data = toml.load(f)
        assert data["dirs"] == ["/a", "/b"]

    def test_open_workspace(self, mock_base):
        mgr = MagicMock()
        mgr.base = mock_base
        loader = WorkspaceLoader(mgr)
        w = Workspace(loader, "path", ["/dir"])
        loader.open_workspace(w)
        mgr.set_workspace.assert_called_once_with(w)

    def test_save(self, workspace_dir):
        path = os.path.join(workspace_dir, "test.toml")
        mgr = MagicMock()
        loader = WorkspaceLoader(mgr)
        w = MagicMock()
        w.export.return_value = {"dirs": ["/x"]}
        loader.save(w, path)
        with open(path) as f:
            data = toml.load(f)
        assert data["dirs"] == ["/x"]


class TestWorkspaceManager:
    @pytest.fixture
    def mgr(self, mock_base):
        wm = WorkspaceManager.__new__(WorkspaceManager)
        wm.base = mock_base
        wm.loader = MagicMock()
        wm.workspace = None
        return wm

    def test_init(self, mock_base):
        wm = WorkspaceManager(mock_base)
        assert wm.workspace is None
        assert isinstance(wm.loader, WorkspaceLoader)

    def test_set_workspace(self, mgr):
        w = MagicMock()
        mgr.set_workspace(w)
        assert mgr.workspace == w
        mgr.base.workspace_opened.assert_called_once()

    def test_add_dir_new_workspace(self, mgr):
        mgr.add_dir("/new_dir")
        assert mgr.workspace is not None
        assert mgr.workspace.dirs == ["/new_dir"]

    def test_add_dir_existing_workspace(self, mgr):
        w = MagicMock()
        mgr.workspace = w
        mgr.add_dir("/another_dir")
        w.add_dir.assert_called_once_with("/another_dir")
        mgr.base.workspace_changed.assert_called_once_with("/another_dir")

    def test_load(self, mgr):
        mgr.load("/path/to/ws.toml")
        mgr.loader.load.assert_called_once_with("/path/to/ws.toml")

    def test_save(self, mgr):
        mgr.save("/path/to/ws.toml")
        mgr.loader.save.assert_called_once_with("/path/to/ws.toml")

    def test_close(self, mgr):
        mgr.close()
        assert mgr.workspace is None
        mgr.base.workspace_closed.assert_called_once()
