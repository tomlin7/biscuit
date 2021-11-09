import tkinter as tk


class DirTreeToolbar(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        tk.Frame.__init__(self, master, *args, **kwargs)
        self.base = master.base
        self.master = master

        self.dirvar = tk.StringVar()
        self.dirvar.set('No Folder Opened')
        
        self.dirname = tk.Label(self, font=("Helvetica", 10, 'bold'), textvariable=self.dirvar)
        self.dirname.pack(side=tk.LEFT, padx=(10, 0))

        self.refresh = tk.Menubutton(
            self, text="⟳", fg="#000000", font=("Helvetica", 11), width=2,
            activebackground="#4c4a48", activeforeground="#ffffff") # , command=self.refresh)
        self.refresh.pack(side=tk.RIGHT)

        self.newfile = tk.Menubutton(
            self, text="+", fg="#000000", font=("Helvetica", 11), width=2,
            activebackground="#4c4a48", activeforeground="#ffffff") #, command=self.newfile)
        self.newfile.pack(side=tk.RIGHT)

    def update_dirname(self):
        if self.base.active_dir_name:
            self.dirvar.set(self.base.active_dir_name)