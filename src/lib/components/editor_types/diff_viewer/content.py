import tkinter as tk
from tkinter import ttk

from .frame import DiffViewerPane
from .differ import Differ


class DiffViewerContent(ttk.PanedWindow):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(master, orient=tk.HORIZONTAL, *args, **kwargs)
        self.base = master.base
        self.master = master
        self.path = path
        
        self.editable = True

        self.lhs_data = []
        self.rhs_data = []

        self.lhs_frame = DiffViewerPane(self, path)
        self.add(self.lhs_frame, weight=1)

        self.rhs_frame = DiffViewerPane(self, path)
        self.add(self.rhs_frame, weight=1)

        self.left = self.lhs_frame.content.text
        self.right = self.text = self.rhs_frame.content.text

        self.lhs_frame.content.scrollbar['command'] = self.on_scrollbar
        self.rhs_frame.content.scrollbar['command'] = self.on_scrollbar
        self.left['yscrollcommand'] = self.on_textscroll
        self.right['yscrollcommand'] = self.on_textscroll

        self.left.tag_config("removal", background="#EC6066")
        self.left.tag_config("addition", background="#eceaea")
        
        self.right.tag_config("addition", background="#99C794")
        self.right.tag_config("removal", background="#eceaea")

        self.prepare_data()

        self.differ = Differ(self)
        self.show_diff()
        
        self.left.set_active(False)

    def on_scrollbar(self, *args):
        self.left.yview(*args)
        self.right.yview(*args)

    def on_textscroll(self, *args):
        self.lhs_frame.content.scrollbar.set(*args)
        self.rhs_frame.content.scrollbar.set(*args)
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
