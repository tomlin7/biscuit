import os

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer


class ExtensionsWatcher(FileSystemEventHandler):
    """Watchdog event handler for the extensions directory.

    The ExtensionsWatcher is used to watch for changes in the extensions directory."""

    def __init__(self, master) -> None:
        self.master = master
        self.base = master.base

        self.observer = Observer()
        self.observer.start()

    def watch(self) -> None:
        if not (self.base.extensionsdir and os.path.isdir(self.base.extensionsdir)):
            try:
                os.makedirs(self.base.extensionsdir, exist_ok=True)
            except:
                self.base.logger.error(
                    "Extensions refreshing failed: no permission to write"
                )
                self.base.notifications.error("Extensions failed: see logs")
                return
        self.observer.schedule(self, self.base.extensionsdir, recursive=True)

    def stop_watch(self) -> None:
        self.observer.stop()

    def on_created(self, *_) -> None:
        self.master.run_fetch_list()

    def on_deleted(self, *_) -> None:
        self.master.run_fetch_list()
