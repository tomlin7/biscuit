import tkinter as tk


class DirectoryTreeToolbar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        tk.Frame.__init__(self, master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.config(bg="#f3f3f3")

        self.dirvar = tk.StringVar()
        self.dirvar.set('NO FOLDER OPENED')

        self.dirname = tk.Label(self)
        self.dirname.config(
            font=("Segoe UI", 10, 'bold'), anchor=tk.W,
            textvariable=self.dirvar, bg="#f3f3f3", fg="#616161")

        self.btn_collapse_all = tk.Menubutton(
            self, text="\ueac5", fg="#424242", font=("codicon", 12), width=2, bg="#f3f3f3",
            activebackground="#e1e1e1", activeforeground="#424242")

        self.btn_refresh = tk.Menubutton(
            self, text="\ueb37", fg="#424242", font=("codicon", 12), width=2, bg="#f3f3f3",
            activebackground="#e1e1e1", activeforeground="#424242")

        self.btn_newfile = tk.Menubutton(
            self, text="\uea7f", fg="#424242", font=("codicon", 12), width=2, bg="#f3f3f3",
            activebackground="#e1e1e1", activeforeground="#424242")

        self.dirname.pack(side=tk.LEFT, padx=(25, 0))
        self.btn_collapse_all.pack(side=tk.RIGHT)
        self.btn_refresh.pack(side=tk.RIGHT)
        self.btn_newfile.pack(side=tk.RIGHT)

    def update_dirname(self):
        if self.base.active_dir_name:
            self.dirvar.set(self.base.active_dir_name.upper())

    def newfile(self): ...
    def refresh(self): ...
    def collapse_all(self): ...
