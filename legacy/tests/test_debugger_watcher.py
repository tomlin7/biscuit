from unittest.mock import MagicMock
from pathlib import Path
import pytest

from biscuit.debugger.config import ConfigLoader
from biscuit.debugger.watcher import DebuggerConfigWatcher


class TestDebuggerWatcher:
    def test_start_watch_when_biscuit_dir_exists(self, tmp_path):
        biscuit_dir = tmp_path / ".biscuit"
        biscuit_dir.mkdir()

        loader = MagicMock()
        loader.base = MagicMock()
        loader.base.active_directory = str(tmp_path)

        watcher = DebuggerConfigWatcher(loader)
        watcher.start_watch()

        assert watcher.observer is not None
        assert watcher._scheduled is True

        watcher.stop_watch()
        assert watcher.observer is None
        assert watcher._scheduled is False

    def test_start_watch_ignored_when_no_biscuit_dir(self, tmp_path):
        loader = MagicMock()
        loader.base = MagicMock()
        loader.base.active_directory = str(tmp_path)

        watcher = DebuggerConfigWatcher(loader)
        watcher.start_watch()

        assert watcher.observer is None
        assert watcher._scheduled is False

    def test_watcher_events_trigger_loader_check(self):
        loader = MagicMock()
        watcher = DebuggerConfigWatcher(loader)

        event = MagicMock()
        watcher.on_created(event)
        loader.check.assert_called_once()

        loader.reset_mock()
        watcher.on_modified(event)
        loader.check.assert_called_once()

        loader.reset_mock()
        watcher.on_deleted(event)
        loader.check.assert_called_once()
