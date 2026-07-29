import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import toml

from biscuit.history import HistoryManager
from biscuit.common.fixedstack import FixedSizeStack


class TestHistoryManager:
    @pytest.fixture
    def history_manager(self, mock_base):
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_base.datadir = Path(tmpdir)
            hm = HistoryManager.__new__(HistoryManager)
            hm.base = mock_base
            hm.path = Path(tmpdir) / "history.toml"
            hm.history = {}
            hm.file_history = FixedSizeStack.__new__(FixedSizeStack)
            hm.file_history.base = mock_base
            hm.file_history.name = "file_history"
            hm.file_history.capacity = 5
            hm.file_history.stack = []
            hm.folder_history = FixedSizeStack.__new__(FixedSizeStack)
            hm.folder_history.base = mock_base
            hm.folder_history.name = "folder_history"
            hm.folder_history.capacity = 5
            hm.folder_history.stack = []
            yield hm

    def test_init_with_tempdir(self, mock_base):
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_base.datadir = Path(tmpdir)
            hm = HistoryManager(mock_base)
            assert isinstance(hm.file_history, FixedSizeStack)
            assert isinstance(hm.folder_history, FixedSizeStack)

    def test_register_file_history(self, history_manager):
        history_manager.register_file_history("/path/to/file.py")
        assert history_manager.file_history.stack == ["/path/to/file.py"]

    def test_register_folder_history(self, history_manager):
        history_manager.register_folder_history("/path/to/folder")
        assert history_manager.folder_history.stack == ["/path/to/folder"]

    def test_dump(self, history_manager):
        history_manager.register_file_history("/a.py")
        history_manager.register_folder_history("/dir")
        history_manager.dump()
        assert history_manager.path.exists()
        with open(history_manager.path) as fp:
            data = toml.load(fp)
        assert "file_history" in data
        assert data["file_history"] == ["/a.py"]

    def test_clear_history(self, history_manager):
        history_manager.register_file_history("/a.py")
        history_manager.register_folder_history("/dir")
        history_manager.clear_history()
        assert history_manager.file_history.is_empty()
        assert history_manager.folder_history.is_empty()

    def test_init_loads_from_existing(self, mock_base):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "history.toml"
            with open(path, "w") as f:
                toml.dump({
                    "file_history": ["/old.py"],
                    "folder_history": ["/old_dir"],
                }, f)
            mock_base.datadir = Path(tmpdir)
            hm = HistoryManager(mock_base)
            assert "/old.py" in hm.file_history.stack

    def test_generate_actionsets(self, history_manager):
        mock_palette = MagicMock()
        history_manager.base.palette = mock_palette
        history_manager.generate_actionsets()
        assert mock_palette.register_actionset.call_count == 2
