from __future__ import annotations

import os
import typing
from pathlib import Path

from watchdog.events import PatternMatchingEventHandler
from watchdog.observers import Observer

if typing.TYPE_CHECKING:
    from .config import ConfigLoader


class DebuggerConfigWatcher(PatternMatchingEventHandler):
    """Watches the workspace `.biscuit` directory for changes to `launch.toml`."""

    def __init__(self, config_loader: ConfigLoader) -> None:
        super().__init__(patterns=["*launch.toml"], ignore_directories=True)
        self.config_loader = config_loader
        self.base = config_loader.base
        self.observer: typing.Optional[Observer] = None
        self._scheduled = False

    def start_watch(self) -> None:
        self.stop_watch()

        if not self.base.active_directory:
            return

        watch_dir = Path(self.base.active_directory) / ".biscuit"
        if not watch_dir.exists():
            return

        try:
            self.observer = Observer()
            self.observer.schedule(self, str(watch_dir), recursive=False)
            self.observer.start()
            self._scheduled = True
        except Exception as e:
            if hasattr(self.base, "logger") and self.base.logger:
                self.base.logger.warning(f"DebuggerConfigWatcher failed to start: {e}")

    def stop_watch(self) -> None:
        if self.observer:
            try:
                self.observer.stop()
                self.observer.join(timeout=1)
            except Exception:
                pass
            self.observer = None
        self._scheduled = False

    def on_created(self, event) -> None:
        self.config_loader.check()

    def on_modified(self, event) -> None:
        self.config_loader.check()

    def on_deleted(self, event) -> None:
        self.config_loader.check()
