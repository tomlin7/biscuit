import tkinter as tk


class DirTreeToolbar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        tk.Frame.__init__(self, master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.dirvar = tk.StringVar()
        self.dirvar.set('NO FOLDER OPENED')

        self.dirname = tk.Label(self)
        self.dirname.config(
            font=("Helvetica", 11, 'bold'), anchor=tk.W,
            textvariable=self.dirvar, bg="#E6E6E6")

        self.btn_collapse_all = tk.Menubutton(
            self, text="–", fg="#000000", font=("Helvetica", 11), width=2, bg="#E6E6E6",
            activebackground="#4c4a48", activeforeground="#ffffff")

        self.btn_refresh = tk.Menubutton(
            self, text="⟳", fg="#000000", font=("Helvetica", 11), width=2, bg="#E6E6E6",
            activebackground="#4c4a48", activeforeground="#ffffff")

        self.btn_newfile = tk.Menubutton(
            self, text="+", fg="#000000", font=("Helvetica", 11), width=2, bg="#E6E6E6",
            activebackground="#4c4a48", activeforeground="#ffffff")

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
