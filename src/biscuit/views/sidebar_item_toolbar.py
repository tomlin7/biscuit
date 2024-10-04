import tkinter as tk

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, IconButton


class SideBarItemToolBar(Frame):
    def __init__(self, master, title: str, buttons=(), *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.views.sidebar.itembar)

        self.grid_columnconfigure(1, weight=1)

        self.title = tk.StringVar(self)
        if title:
            self.set_title(title)

        self.toggle = IconButton(
            self, icon=Icons.CHEVRON_DOWN, event=self.toggle_content, width=1
        )
        self.toggle.grid(row=0, column=0)

        self.label_title = tk.Label(
            self,
            anchor=tk.W,
            textvariable=self.title,
            font=self.base.settings.uifont_bold,
            **self.base.theme.views.sidebar.itembar.title
        )
        self.label_title.grid(row=0, column=1, sticky=tk.EW)

        self.buttoncolumn = 0
        self.actions = Frame(self, **self.base.theme.views.sidebar.itembar)
        self.actions.grid(row=0, column=2, sticky=tk.E)

        self.add_actions(buttons)

    def add_action(self, *args) -> None:
        IconButton(self.actions, *args).grid(row=0, column=self.buttoncolumn)
        self.buttoncolumn += 1

    def add_actions(self, buttons) -> None:
        for btn in buttons:
            self.add_action(*btn)

    def set_title(self, title: str) -> None:
        self.title.set(title.upper())

    def toggle_content(self, *_) -> None:
        if not self.master.enabled:
            self.toggle.set_icon(Icons.CHEVRON_DOWN)
        else:
            self.toggle.set_icon(Icons.CHEVRON_RIGHT)
        self.master.toggle()

    def hide_content(self, *_) -> None:
        self.toggle.set_icon(Icons.CHEVRON_RIGHT)
        self.master.disable()

    def show_content(self, *_) -> None:
        self.toggle.set_icon(Icons.CHEVRON_DOWN)
        self.master.enable()
