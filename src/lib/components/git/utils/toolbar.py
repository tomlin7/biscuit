import tkinter as tk


class GitTreeToolbar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        tk.Frame.__init__(self, master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.dirvar = tk.StringVar()
        self.dirname = tk.Label(self, font=("Helvetica", 10, 'bold'), textvariable=self.dirvar)
        
        self.more_actions = tk.Menubutton(
            self, text="...", fg="#000000", font=("Helvetica", 11), width=2,
            activebackground="#4c4a48", activeforeground="#ffffff")
        self.refresh = tk.Menubutton(
            self, text="⟳", fg="#000000", font=("Helvetica", 11), width=2,
            activebackground="#4c4a48", activeforeground="#ffffff")
        self.commit = tk.Menubutton(
            self, text="✔", fg="#000000", font=("Helvetica", 11), width=2,
            activebackground="#4c4a48", activeforeground="#ffffff")
        self.synchronize = tk.Menubutton(
            self, text="🔄", fg="#000000", font=("Helvetica", 11), width=2,
            activebackground="#4c4a48", activeforeground="#ffffff")
        
        self.branchname = tk.Menubutton(
            self, text="None", fg="#000000", font=("Helvetica", 10), 
            activebackground="#4c4a48", activeforeground="#ffffff")
        
        
        self.dirname.pack(side=tk.LEFT, padx=(10, 0))
        self.more_actions.pack(side=tk.RIGHT)
        self.refresh.pack(side=tk.RIGHT)
        self.commit.pack(side=tk.RIGHT)
        self.synchronize.pack(side=tk.RIGHT)
        self.branchname.pack(side=tk.RIGHT)
    
    def update(self):
        self.update_dirname()
        self.update_branchname()

    def update_dirname(self):
        if self.base.active_dir_name:
            self.dirvar.set(self.base.active_dir_name)
    
    def update_branchname(self):
        if self.base.git_found:
            self.branchname.config(text=self.base.active_branch_name)