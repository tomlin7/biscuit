import re
import threading
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

        self.lhs_last_line = None
        self.rhs_last_line = None

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
    
    def run_show_diff(self):
        threading.Thread(target=self.show_diff).start()
    
    def show_diff(self):
        lhs_data = self.base.git.repo.get_commit_filedata(self.path)
        with open(self.path, 'r') as f:
            rhs_data = f.read()

        lhs_lines = [line+"\n" for line in lhs_data.split('\n')]
        rhs_lines = [line+"\n" for line in rhs_data.split('\n')]
        
        self.diff = list(self.differ.get_diff(lhs_lines, rhs_lines))
        for i, line in enumerate(self.diff):
            marker = line[0]
            content = line[2:]

            match marker:
                case " ":
                    # line is same in both
                    self.left.write(content)
                    self.right.write(content)

                case "-":
                    # line is only on the left
                    self.lhs_last_line = int(float(self.left.index(tk.INSERT)))
                    self.left.write(content, "removal")

                    # only if the next line's marker is not ? add a newline
                    try:
                        if not self.diff[i + 1][0] in ["?", " "]: 
                            self.right.newline("removal")
                    except:
                        pass

                case "+":
                    # line is only on the right
                    self.rhs_last_line = int(float(self.right.index(tk.INSERT)))
                    self.right.write(content, "addition")
                    
                    # only if the next line's marker is not ? add a newline
                    try:
                        if not self.diff[i + 1][0] in ["?", " "]:
                            self.left.newline("addition")
                    except:
                        pass

                case "?":
                    # the above line has changes
                    for match in re.finditer(r'\++', content):
                        start = f"{self.rhs_last_line}.{match.start()}"
                        end = f"{self.rhs_last_line}.{match.end()}"
                        self.right.tag_add("uhhh", start, end)

                    for match in re.finditer(r'-+', content):
                        start = f"{self.lhs_last_line}.{match.start()}"
                        end = f"{self.lhs_last_line}.{match.end()}"
                        self.left.tag_add("uhhh", start, end)
                    
            self.left.update()
            self.right.update()
        
        self.left.highlighter.highlight()
        self.right.highlighter.highlight()

        # Add extra empty lines at the bottom if one side has fewer lines
        lhs_line_count = int(float(self.left.index(tk.END))) - 1
        rhs_line_count = int(float(self.right.index(tk.END))) - 1
        if lhs_line_count > rhs_line_count:
            extra_newlines = lhs_line_count - rhs_line_count
            for _ in range(extra_newlines):
                self.right.newline()
        elif rhs_line_count > lhs_line_count:
            extra_newlines = rhs_line_count - lhs_line_count
            for _ in range(extra_newlines):
                self.left.newline()
