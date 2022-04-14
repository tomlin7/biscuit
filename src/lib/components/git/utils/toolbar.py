import tkinter as tk


class GitTreeToolbar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        tk.Frame.__init__(self, master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.dirvar = tk.StringVar()
        self.dirname = tk.Label(self)
        self.dirname.config(
            font=("Segoe UI", 10, 'bold'), anchor=tk.W, 
            textvariable=self.dirvar, bg="#E6E6E6", fg="#616161")
        
        self.more_actions = tk.Menubutton(self)
        self.more_actions.config(text="\uea7c", bg="#E6E6E6", fg="#000000", font=("codicon", 12), width=2,
            activebackground="#4c4a48", activeforeground="#ffffff")
        
        self.refresh = tk.Menubutton(self)
        self.refresh.config(text="\ueb37", fg="#000000", bg="#E6E6E6", font=("codicon", 12), width=2,
            activebackground="#4c4a48", activeforeground="#ffffff")
        
        self.commit = tk.Menubutton(self)
        self.commit.config(text="\ueab2", fg="#000000", bg="#E6E6E6", font=("codicon", 12), width=2,
            activebackground="#4c4a48", activeforeground="#ffffff")
        
        
        self.dirname.pack(side=tk.LEFT, padx=(25, 0))
        self.more_actions.pack(side=tk.RIGHT)
        self.refresh.pack(side=tk.RIGHT)
        self.commit.pack(side=tk.RIGHT)
    
    def update(self):
        self.update_dirname()

    def update_dirname(self):
        if self.base.active_dir_name:
            self.dirvar.set(self.base.active_dir_name)