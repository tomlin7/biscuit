import tkinter as tk

from .pane import DiffPane
from .differ import Differ
from ..editor import BaseEditor


class DiffEditor(BaseEditor):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)
        self.path = path

        self.editable = True

        self.lhs_data = []
        self.rhs_data = []


        self.lhs = DiffPane(self, path)
        self.lhs.grid(row=0, column=0, sticky=tk.NSEW)

        self.rhs = DiffPane(self, path)
        self.rhs.grid(row=0, column=1, sticky=tk.NSEW)

        self.left = self.lhs.text
        self.right = self.text = self.rhs.text

        self.lhs.scrollbar['command'] = self.on_scrollbar
        self.rhs.scrollbar['command'] = self.on_scrollbar
        self.left['yscrollcommand'] = self.on_textscroll
        self.right['yscrollcommand'] = self.on_textscroll

        self.left.tag_config("removal", background="#ffa3a3")
        self.left.tag_config("addition", background="#d3d3d3")
        
        self.right.tag_config("addition", background="#dbe6c2")
        self.right.tag_config("removal", background="#d3d3d3")

        self.prepare_data()

        self.differ = Differ(self)
        self.show_diff()
        
        self.left.set_active(False)

    def on_scrollbar(self, *args):
        self.left.yview(*args)
        self.right.yview(*args)

    def on_textscroll(self, *args):
        self.lhs.scrollbar.set(*args)
        self.rhs.scrollbar.set(*args)
        self.on_scrollbar('moveto', args[0])
    
    def prepare_data(self):
        lhs_data = self.base.git.repo.get_commit_filedata(self.path).split("\n")
        self.lhs_data = [f"{line}\n" if line else "\n" for line in lhs_data]
        with open(self.path, 'r') as f:
            self.rhs_data = f.readlines()
        
    def show_diff(self):
        self.diff = self.differ.get_diff(self.lhs_data, self.rhs_data)
        for line in self.diff:
            marker = line[0]

            if marker == " ":
                # line is same in both
                self.left.write(line[2:])
                self.right.write(line[2:])

            elif marker == "-":
                # line is only on the left
                self.left.write(line[2:], "removal")
                self.right.newline("removal")

            elif marker == "+":
                # line is only on the right
                self.left.newline("addition")
                self.right.write(line[2:], "addition")
