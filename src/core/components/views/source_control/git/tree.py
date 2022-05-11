import threading
import tkinter as tk
import tkinter.ttk as ttk

class GitTree(ttk.Treeview):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.file_icn = tk.PhotoImage(data="""
        iVBORw0KGgoAAAANSUhEUgAAAA0AAAARCAYAAAAG/yacAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB
        3d3cuaW5rc2NhcGUub3Jnm+48GgAAAS1JREFUKJHVkbFKA0EQhr/Z22ghAbW0sQkpNXaijyAo8Q1O9BYCNul8Cq0Ce+6ltr
        CysrKSdGLhe4SAjRy7WZtTknAJWPo3u8z/f8wMI0VRNL33d0AX2GJeZQjhqNfrvc0WVQjhFrioAQDWkiQZOecO5qAYYxdAR
        M6MMWKMERFJK38I6BDCQ1EUO78QsA2UWZY9LbaJMb6KyBXQ8t6/OOd2fyCAac1oAGRZNgQM0A4hfAwGgz21LFyN3AIwxjjg
        OsbYTJJkpJfkv6r3xlp7AngApVQZY9yohRqNxnNZliPgENif2XEKUAulaToBjhfr1tp3oLNyp2X6J5D8Ja+AMbCe5/npqnS
        e5x2gDYzFWnsPXFbeJ9UhFyTAZvV3Wmvd994r4HzGqNMEeNRa978B0Ltjzw4Umh0AAAAASUVORK5CYII=""")
        
        self.configure(show="tree", columns=("fullpath"), displaycolumns='')
        self.bind('<Double-Button-1>', self.openfile)
    
    def openfile(self, event):
        item = self.focus()
        path = self.set(item, "fullpath")
        self.base.set_active_file(path, diff=True)

    def clean_tree(self):
        self.delete(*self.get_children())

    def add_files(self, parent, changed_files):
        for file in changed_files:
            oid = self.insert(parent, tk.END, text=f"  {file}", values=[file], image=self.file_icn)

    def add_tree(self, basename, files=None):
        oid = self.insert('', tk.END, text=basename, open=True)
        if files:
            self.add_files(oid, files)
    
    def open_repo(self, repo):
        changed_files = repo.get_changed_files()
        untracked_files = repo.get_untracked_files()
        
        self.clean_tree()
        self.add_tree("Changes", changed_files)
        self.add_tree("Untracked Files", untracked_files)

    def open_repo_dir(self):
        threading.Thread(target=self.open_repo, args=[self.base.git.repo]).start()
