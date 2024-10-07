import tkinter as tk

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, Icon, IconButton, Label


class Tab(Frame):
    """Tab for terminal panel."""

    def __init__(self, master, terminal, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.terminal = terminal
        self.selected = False

        self.bg, self.fg, self.hbg, self.hfg = (
            self.base.theme.views.panel.terminal.tab.values()
        )
        self.config(bg=self.bg)

        self.icon = Icon(
            self,
            icon=terminal.icon or Icons.TERMINAL,
            width=3,
            **self.base.theme.views.panel.terminal.content
        )
        self.icon.pack(side=tk.LEFT)

        self.name = Label(
            self,
            text=terminal.name or terminal.__class__.__name__,
            padx=5,
            font=self.base.settings.uifont,
            anchor=tk.W,
            bg=self.bg,
            fg=self.fg,
        )
        self.name.pack(side=tk.LEFT, expand=True, fill=tk.X)

        self.closebtn = IconButton(
            self,
            Icons.CLOSE,
            event=self.close,
            **self.base.theme.views.panel.terminal.tab
        )
        self.closebtn.pack(padx=5)

        self.bind("<Button-1>", self.select)
        self.icon.bind("<Button-1>", self.select)
        self.name.bind("<Button-1>", self.select)

        self.bind("<Enter>", self.on_hover)
        self.bind("<Leave>", self.off_hover)

    def close(self, *_) -> None:
        self.master.close_tab(self)

    def on_hover(self, *_) -> None:
        if not self.selected:
            self.icon.config(bg=self.hbg)
            self.name.config(bg=self.hbg)
            self.config(bg=self.hbg)
            self.closebtn.config(bg=self.hbg)

            self.hovered = True

    def off_hover(self, *_) -> None:
        if not self.selected:
            self.icon.config(bg=self.bg)
            self.name.config(bg=self.bg)
            self.config(bg=self.bg)
            self.closebtn.config(bg=self.bg)
            self.hovered = False

    def deselect(self, *_) -> None:
        if self.selected:
            self.terminal.grid_remove()

            self.icon.config(bg=self.bg, fg=self.fg)
            self.name.config(bg=self.bg, fg=self.fg)
            self.config(bg=self.bg)
            self.closebtn.config(bg=self.bg, activeforeground=self.fg)
            self.selected = False

    def select(self, *_) -> None:
        if not self.selected:
            self.master.set_active_tab(self)
            self.terminal.grid(column=0, row=0, sticky=tk.NSEW)

            self.icon.config(bg=self.hbg, fg=self.hfg)
            self.name.config(bg=self.hbg, fg=self.hfg)
            self.config(bg=self.hbg)
            self.closebtn.config(bg=self.hbg, activeforeground=self.hfg)
            self.selected = True
