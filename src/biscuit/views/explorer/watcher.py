from __future__ import annotations

import os
import typing

from watchdog.events import PatternMatchingEventHandler
from watchdog.observers import Observer

if typing.TYPE_CHECKING:
    from .directorytree import DirectoryTree


class DirectoryTreeWatcher(PatternMatchingEventHandler):
    """Watchdog event handler for the directory tree.

    The DirectoryTreeWatcher is used to watch for changes in the directory tree.
    - The DirectoryTreeWatcher is used to update the directory tree when changes are detected.
    - The DirectoryTreeWatcher is used to reload the source control tree when changes are detected.
    """

    def __init__(self, master: DirectoryTree, tree, observe_changes) -> None:
        self.master = master
        self.base = master.base
        self.tree = tree
        self.observe_changes = observe_changes

        super().__init__(ignore_patterns=self.master.changes_ignore_dir_patterns)

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
        self.base.source_control.reload_tree()
        print("created", event.src_path)

    def on_deleted(self, event) -> None:
        self.master.update_path(os.path.dirname(event.src_path))
        self.base.source_control.reload_tree()
        print("deleted", event.src_path)

    def on_modified(self, event) -> None:
        # self.master.update_path(os.path.dirname(event.src_path))
        # self.base.source_control.reload_tree()
        # print('modified', event.src_path)
        ...

    def on_moved(self, event):
        try:
            self.master.update_path(os.path.dirname(event.src_path))
            self.base.source_control.reload_tree()
            print("moved", event.src_path, event.dest_path)
        except FileNotFoundError:
            pass
