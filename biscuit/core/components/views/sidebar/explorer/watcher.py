import os

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer


class DirectoryTreeWatcher(FileSystemEventHandler):
    def __init__(self, master, tree, observe_changes) -> None:
        self.master = master
        self.tree = tree
        self.observe_changes = observe_changes

        self.observer = Observer()
        self.observer.start()

    def watch(self) -> None:
        self.observer.unschedule_all()
        if self.master.path and self.observe_changes:
            self.observer.schedule(self, self.master.path, recursive=True)

    def stop_watch(self) -> None:
        self.observer.stop()

    def on_created(self, event) -> None:
        self.master.update_path(os.path.dirname(event.src_path))

    def on_deleted(self, event) -> None:
        self.master.update_path(os.path.dirname(event.src_path))

    def on_modified(self, event) -> None: ...
        #self.master.update_path(os.path.dirname(event.src_path))

