import tkinter as tk


class WelcomePage(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.config(padx=100, pady=100)

        self.title = tk.Label(self, text="Biscuit", font=("Segoe UI", 45), fg="#616161")
        self.title.grid(row=0, column=0, sticky=tk.W)

        self.description = tk.Label(self, text="Editing, but tasty", font=("Segoe UI", 30), fg="#616161")
        self.description.grid(row=1, column=0, sticky=tk.W)

        self.create_start_group()
    
    def create_start_group(self):
        self.start = tk.Label(self, text="Start", font=("Segoe UI", 20), fg="#616161")
        self.start.grid(row=2, column=0, sticky=tk.W, pady=(30, 0))
        
        self.start_group = tk.Frame(self)
        self.start_group.grid(row=3, column=0, sticky=tk.EW)

        self.btn_newfile_icon = tk.Label(self.start_group, text="📑", font=("Segoe UI", 15), fg="#006ab8")
        self.btn_newfile_icon.grid(row=0, column=0, sticky=tk.W, pady=2)
        self.btn_newfile = tk.Label(self.start_group, text="New File...", font=("Segoe UI", 15), fg="#006ab8")
        self.btn_newfile.grid(row=0, column=1, sticky=tk.W, pady=2)

        self.btn_newfile_icon.bind("<Button-1>", self.new_file)
        self.btn_newfile.bind("<Button-1>", self.new_file)

        self.btn_openfile_icon = tk.Label(self.start_group, text="📄", font=("Segoe UI", 15), fg="#006ab8")
        self.btn_openfile_icon.grid(row=1, column=0, sticky=tk.W, pady=2)
        self.btn_openfile = tk.Label(self.start_group, text="Open File...", font=("Segoe UI", 15), fg="#006ab8")
        self.btn_openfile.grid(row=1, column=1, sticky=tk.W, pady=2)

        self.btn_openfile_icon.bind("<Button-1>", self.open_file)
        self.btn_openfile.bind("<Button-1>", self.open_file)

        self.btn_openfolder_icon = tk.Label(self.start_group, text="📂", font=("Segoe UI", 15), fg="#006ab8")
        self.btn_openfolder_icon.grid(row=2, column=0, sticky=tk.W, pady=2)
        self.btn_openfolder = tk.Label(self.start_group, text="Open Folder...", font=("Segoe UI", 15), fg="#006ab8")
        self.btn_openfolder.grid(row=2, column=1, sticky=tk.W, pady=2)

        self.btn_openfolder_icon.bind("<Button-1>", self.open_folder)
        self.btn_openfolder.bind("<Button-1>", self.open_folder)

    def new_file(self, _):
        self.base.events.new_file()
    
    def open_file(self, _):
        self.base.events.open_file()
    
    def open_folder(self, _):
        self.base.events.open_dir()
