import re
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

        self.last_line = None

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

        self.stipple = self.base.settings.res.stipple

        self.left.tag_config("addition", background=self.base.theme.editors.diff.not_exist, bgstipple=f"@{self.stipple}")
        self.left.tag_config("removal", background=self.base.theme.editors.diff.removed)
        self.left.tag_config("uhhh", background="red")
        
        self.right.tag_config("addition", background=self.base.theme.editors.diff.addition)
        self.right.tag_config("removal", background=self.base.theme.editors.diff.not_exist, bgstipple=f"@{self.stipple}")
        self.right.tag_config("uhhh", background="green")

        self.differ = Differ(self)
        self.show_diff()
        
        self.left.set_active(False)

    def on_scrollbar(self, *args):
        self.left.yview(*args)
        self.lhs.on_scroll()

        self.right.yview(*args)
        self.rhs.on_scroll()

    def on_textscroll(self, *args):
        self.lhs.scrollbar.set(*args)
        self.rhs.scrollbar.set(*args)
        self.on_scrollbar('moveto', args[0])
    
    def show_diff(self):
        lhs_data = self.base.git.repo.get_commit_filedata(self.path).split("\n")
        self.lhs_data = [f"{line}\n" if line else "\n" for line in lhs_data]
        with open(self.path, 'r') as f:
            self.rhs_data = f.readlines()
        
        self.diff = self.differ.get_diff(self.lhs_data, self.rhs_data)
        for line in self.diff:
            marker = line[0]
            content = line[2:]

            match marker:
                case" ":
                    # line is same in both
                    self.left.write(content)
                    self.right.write(content)

                case "-":
                    # line is only on the left
                    self.left.write(content, "removal")
                    self.right.newline("removal")

                case "+":
                    # line is only on the right
                    self.last_line = int(float(self.right.index(tk.INSERT)))
                    self.left.newline("addition")
                    self.right.write(content, "addition")
                
                case "?":
                    # the above line has changes
                    matches = re.finditer(r'\++', content)
                    for match in matches:
                        start = f"{self.last_line}.{match.start()}"
                        end = f"{self.last_line}.{match.end()}"
                        self.right.tag_add("uhhh", start, end)
