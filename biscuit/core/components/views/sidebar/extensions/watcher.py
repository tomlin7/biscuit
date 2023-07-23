import os

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer


class ExtensionsWatcher(FileSystemEventHandler):
    def __init__(self, master):
        self.master = master
        self.base = master.base

        self.observer = Observer()
        self.observer.start()

    def watch(self):
        if not (self.base.extensionsdir and os.path.isdir(self.base.extensionsdir)):
            try:
                os.makedirs(self.base.extensionsdir, exist_ok=True)
            except:
                self.base.logger.error("Extensions refreshing failed: no permission to write")
                self.base.notifications.error("Extensions failed: see logs")
                return
        self.observer.schedule(self, self.base.extensionsdir, recursive=True)
    
    def stop_watch(self):
        self.observer.stop()

    def on_created(self, *_):
        self.master.run_fetch_list()

    def on_deleted(self, *_):
        self.master.run_fetch_list()
