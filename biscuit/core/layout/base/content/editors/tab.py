import tkinter as tk
from biscuit.core.components.utils import IconButton, Frame


class Tab(Frame):
    def __init__(self, master, editor, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.editor = editor
        self.selected = False

        self.bg, self.fg, self.hbg, self.hfg = self.base.theme.layout.base.content.editors.bar.tab.values()
        self.config(bg=self.bg)

        self.name = tk.Label(self, text=f"{editor.filename} (working tree)" if editor.diff else editor.filename,
                             padx=5, pady=5, font=('Segoe UI', 10), bg=self.bg, fg=self.fg)
        self.name.pack(side=tk.LEFT)

        self.closebtn = IconButton(self, 'close', event=self.close, **self.base.theme.layout.base.content.editors.bar.tab.close)
        self.closebtn.pack(pady=5, padx=5)

        self.bind("<Button-1>", self.select)
        self.name.bind("<Button-1>", self.select)

        self.bind("<Enter>", self.on_hover)
        self.bind("<Leave>", self.off_hover)
    
    def close(self, *_):
        self.master.close_tab(self)
    
    def on_hover(self, *_):
        if not self.selected:
            self.name.config(bg=self.hbg)
            self.config(bg=self.hbg)
            self.closebtn.config(bg=self.hbg)
            self.hovered = True

    def off_hover(self, *_):
        if not self.selected:
            self.name.config(bg=self.bg)
            self.config(bg=self.bg)
            self.closebtn.config(bg=self.bg)
            self.hovered = False

    def deselect(self, *_):
        if self.selected:
            self.editor.grid_remove()
            self.name.config(bg=self.bg)
            self.config(bg=self.bg)
            self.closebtn.config(bg=self.bg, activeforeground=self.fg)
            self.selected = False
        
    def select(self, *_):
        if not self.selected:
            self.master.set_active_tab(self)
            self.editor.grid(column=0, row=1, sticky=tk.NSEW)
            self.name.config(bg=self.hbg)
            self.config(bg=self.hbg)
            self.closebtn.config(bg=self.hbg, activeforeground=self.hfg)
            self.selected = True
