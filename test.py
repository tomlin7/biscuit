import os 
from tkinter import *
from tkinter import ttk
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class DirectoryWatcher(FileSystemEventHandler):
    def __init__(self, tree):
        self.tree = tree
        self.update_tree()

    def on_created(self, event):
        self.update_tree()

    def on_deleted(self, event):
        self.update_tree()

    def on_modified(self, event):
        self.update_tree()

    def update_tree(self):
        self.tree.delete(*self.tree.get_children())
        root_node = self.tree.insert("", "end", text="root", open=True)
        for root, dirs, files in os.walk("./Biscuit"):
            dir_node = self.tree.insert(
                root_node, "end", text=root.split("/")[-1], open=True
            )
            for file in files:
                self.tree.insert(dir_node, "end", text=file)

root = Tk()
tree = ttk.Treeview(root)
tree.pack()

watcher = DirectoryWatcher(tree)
observer = Observer()
observer.schedule(watcher, "./Biscuit", recursive=True)
observer.start()

root.mainloop()