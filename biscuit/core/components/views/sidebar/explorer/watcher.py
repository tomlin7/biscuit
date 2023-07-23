import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class DirectoryTreeWatcher(FileSystemEventHandler):
    def __init__(self, master, tree, observe_changes):
        self.master = master
        self.tree = tree
        self.observe_changes = observe_changes

        self.observer = Observer()
        self.observer.start()

    def watch(self):
        self.observer.unschedule_all()
        if self.master.path and self.observe_changes:
            self.observer.schedule(self, self.master.path, recursive=True)
    
    def stop_watch(self):
        self.observer.stop()

    def on_created(self, event):
        self.master.create_root()

    def on_deleted(self, event):
        self.master.create_root()

    def on_modified(self, event):
        self.master.create_root()
    
    async def async_scandir(self, path):
        entries = []
        for entry in os.scandir(path):
            entries.append((entry.name, entry.path))
        return entries