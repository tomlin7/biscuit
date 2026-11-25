import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import toml

from biscuit.session import SessionManager


class TestSessionManager:
    def test_init_no_existing_session(self, mock_base):
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_base.datadir = Path(tmpdir)
            sm = SessionManager(mock_base)
            assert sm.session == {}

    def test_init_with_existing_session(self, mock_base):
        with tempfile.TemporaryDirectory() as tmpdir:
            session_path = Path(tmpdir) / "session.toml"
            with open(session_path, "w") as f:
                toml.dump({"active_directory": "/test", "opened_files": ["/a.py", "/b.py"]}, f)
            mock_base.datadir = Path(tmpdir)
            sm = SessionManager(mock_base)
            assert sm.session["active_directory"] == "/test"

    def test_clear_session(self, mock_base):
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_base.datadir = Path(tmpdir)
            sm = SessionManager(mock_base)
            sm.session = {"active_directory": "/test"}
            sm.clear_session()
            assert sm.session == {}

    def test_clear_session_also_clears_file(self, mock_base):
        with tempfile.TemporaryDirectory() as tmpdir:
            session_path = Path(tmpdir) / "session.toml"
            with open(session_path, "w") as f:
                toml.dump({"active_directory": "/test"}, f)
            mock_base.datadir = Path(tmpdir)
            sm = SessionManager(mock_base)
            sm.clear_session()
            assert toml.load(session_path) == {}

    def test_save_session(self, mock_base):
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_base.datadir = Path(tmpdir)
            sm = SessionManager(mock_base)
            sm.save_session(["/a.py", "/b.py"], "/active_dir")
            session_path = Path(tmpdir) / "session.toml"
            data = toml.load(session_path)
            assert data["active_directory"] == "/active_dir"
            assert data["opened_files"] == ["/a.py", "/b.py"]

    def test_restore_session(self, mock_base):
        with tempfile.TemporaryDirectory() as tmpdir:
            session_path = Path(tmpdir) / "session.toml"
            with open(session_path, "w") as f:
                toml.dump({"active_directory": "/test_dir", "opened_files": []}, f)
            mock_base.datadir = Path(tmpdir)
            sm = SessionManager(mock_base)
            sm.restore_session()
            mock_base.open_directory.assert_called_once_with("/test_dir")

    def test_restore_session_no_session(self, mock_base):
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_base.datadir = Path(tmpdir)
            sm = SessionManager(mock_base)
            sm.restore_session()
            mock_base.open_directory.assert_not_called()

    def test_close(self, mock_base):
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_base.datadir = Path(tmpdir)
            sm = SessionManager(mock_base)
            sm.close()
