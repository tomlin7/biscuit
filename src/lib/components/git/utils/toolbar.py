import tkinter as tk


class GitTreeToolbar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        tk.Frame.__init__(self, master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.dirvar = tk.StringVar()
        self.dirname = tk.Label(self)
        self.dirname.config(font=("Segoe UI", 12, 'bold'), anchor=tk.W, textvariable=self.dirvar)
        
        self.more_actions = tk.Menubutton(self)
        self.more_actions.config(text="⋯", fg="#000000", font=("Segoe UI", 12), width=2,
            activebackground="#4c4a48", activeforeground="#ffffff")
        
        self.refresh = tk.Menubutton(self)
        self.refresh.config(text="⟳", fg="#000000", font=("Segoe UI", 12), width=2,
            activebackground="#4c4a48", activeforeground="#ffffff")
        
        self.commit = tk.Menubutton(self)
        self.commit.config(text="✔", fg="#000000", font=("Segoe UI", 12), width=2,
            activebackground="#4c4a48", activeforeground="#ffffff")
        
        self.synchronize = tk.Menubutton(self)
        self.synchronize.config(text="🔄", fg="#000000", font=("Segoe UI", 12), width=2,
            activebackground="#4c4a48", activeforeground="#ffffff")
        
        self.branchname = tk.Menubutton(self)
        self.branchname.config(text=" None", fg="#000000", font=("Segoe UI", 9), 
            activebackground="#4c4a48", activeforeground="#ffffff", justify=tk.CENTER)
        
        self.dirname.pack(side=tk.LEFT)

        self.more_actions.pack(side=tk.RIGHT)
        self.refresh.pack(side=tk.RIGHT)
        self.commit.pack(side=tk.RIGHT)
        self.synchronize.pack(side=tk.RIGHT)
        
        self.branchname.pack(side=tk.RIGHT, fill=tk.Y)
    
    def update(self):
        self.update_dirname()
        self.update_branchname()

    def update_dirname(self):
        if self.base.active_dir_name:
            self.dirvar.set(self.base.active_dir_name)
    
    def update_branchname(self):
        if self.base.git_found:
            self.branchname.config(text=f" {self.base.active_branch_name}")