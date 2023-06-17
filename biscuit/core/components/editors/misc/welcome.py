import tkinter as tk

from ...utils import IconButton
from ..editor import BaseEditor


class Welcome(BaseEditor):
    def __init__(self, master, exists=False, editable=False, *args, **kwargs):
        super().__init__(master, exists=exists, editable=editable, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.config(padx=100, pady=100, bg='white')

        self.left = tk.Frame(self, bg='white')
        self.left.pack(expand=True, side=tk.LEFT, fill=tk.BOTH, anchor=tk.CENTER)

        self.right = tk.Frame(self, bg='white')
        self.right.pack(expand=True, fill=tk.BOTH, anchor=tk.CENTER)

        self.title = tk.Label(self.left, text="Biscuit", font=("Segoe UI", 45), fg="#dc8c34", bg='white')
        self.title.grid(row=0, column=0, sticky=tk.W)

        self.description = tk.Label(self.left, text="Made with ❤", font=("Segoe UI", 20), fg="#ecb464", bg='white')
        self.description.grid(row=1, column=0, sticky=tk.W, pady=5)

        self.create_start_group()

        self.logo = tk.Label(self.right, image=self.base.settings.res.logo, bg='white')
        self.logo.grid(row=0, column=0, sticky=tk.NSEW)
    
    def create_start_group(self):
        tk.Label(self.left, text="Start", font=("Segoe UI", 15), fg="black", bg='white').grid(row=2, column=0, sticky=tk.W, pady=(30, 0))
        start_group = tk.Frame(self.left, bg='white')
        start_group.grid(row=3, column=0, sticky=tk.EW)

        IconButton(start_group, 'new-file', self.new_file, bg='white').grid(row=0, column=0, sticky=tk.W, pady=2)
        btn_newfile = tk.Label(start_group, text="New File...", font=("Segoe UI", 12), fg="grey", bg='white')
        btn_newfile.grid(row=0, column=1, sticky=tk.W, pady=2)
        btn_newfile.bind("<Button-1>", self.new_file)

        IconButton(start_group, 'go-to-file', self.open_file, bg='white').grid(row=1, column=0, sticky=tk.W, pady=2)
        btn_openfile = tk.Label(start_group, text="Open File...", font=("Segoe UI", 12), fg="grey", bg='white')
        btn_openfile.grid(row=1, column=1, sticky=tk.W, pady=2)
        btn_openfile.bind("<Button-1>", self.open_file)

        IconButton(start_group, 'folder-opened', self.open_folder, bg='white').grid(row=2, column=0, sticky=tk.W, pady=2)
        btn_openfolder = tk.Label(start_group, text="Open Folder...", font=("Segoe UI", 12), fg="grey", bg='white')
        btn_openfolder.grid(row=2, column=1, sticky=tk.W, pady=2)
        btn_openfolder.bind("<Button-1>", self.open_folder)

        #TODO add recents

    def new_file(self, _):
        self.base.events.new_file()
    
    def open_file(self, _):
        self.base.events.open_file()
    
    def open_folder(self, _):
        self.base.events.open_dir()
