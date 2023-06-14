import tkinter as tk


class Highlighter:
    def __init__(self, master, *args, **kwargs):
        self.text = master
        self.base = master.base

        self.syntax = master.lsp
        self.setup_highlight_tags()

    def setup_highlight_tags(self):
        self.text.tag_configure("keywords", foreground="#559dd2")
        self.text.tag_configure("strings", foreground="#cf8e7c")
        self.text.tag_configure("numbers", foreground="#b5cfab")
        self.text.tag_configure("comments", foreground="#699b5c")

    def highlight_pattern(self, pattern, tag, start="1.0", end=tk.END, regexp=False):
        start = self.text.index(start)
        end = self.text.index(end)
        
        self.text.mark_set("matchStart", start)
        self.text.mark_set("matchEnd", start)
        self.text.mark_set("searchLimit", end)

        self.text.tag_remove(tag, start, end)
        
        count = tk.IntVar()
        while True:
            index = self.text.search(pattern, "matchEnd", "searchLimit", count=count, regexp=regexp)
            if index == "" or count.get() == 0:
                break

            self.text.mark_set("matchStart", index)
            self.text.mark_set("matchEnd", f"{index}+{count.get()}c")

            self.text.tag_add(tag, "matchStart", "matchEnd")

    def highlight_all(self):
        self.highlight_pattern(self.syntax.rgx_keywords, "keywords", regexp=True)
        self.highlight_pattern(self.syntax.rgx_numbers, "numbers", regexp=True)
        
        self.highlight_pattern(self.syntax.rgx_strings, "strings", regexp=True)
        self.highlight_pattern(self.syntax.rgx_comments, "comments", regexp=True)
