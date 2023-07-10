from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class ExtensionsWatcher(FileSystemEventHandler):
    def __init__(self, master):
        self.master = master
        self.base = master.base

        self.observer = Observer()
        self.observer.start()

    def watch(self):
        self.observer.schedule(self, self.base.extensionsdir, recursive=True)
    
    def stop_watch(self):
        self.observer.stop()

    def on_created(self, *_):
        self.master.run_fetch_list()

    def on_deleted(self, *_):
        self.master.run_fetch_list()

    def on_modified(self, *_):
        self.master.run_fetch_list()
