from __future__ import annotations

import os
import tkinter as tk
import typing

from biscuit.common import Icons
from biscuit.common.ui import Frame, Icon, IconButton

if typing.TYPE_CHECKING:
    from biscuit.editor import Editor

    from .editorsbar import EditorsBar

# TODO: show modified, saved state in the tab


class Tab(Frame):
    """Editor Tab

    An editor instance is attached to each tab.
    Shows the filename, icon and close button.
    """

    def __init__(self, master: EditorsBar, editor: Editor, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master: EditorsBar = master
        self.editor = editor
        self.selected = False

        self.bg, self.fg, self.hbg, self.hfg = (
            self.base.theme.layout.content.editors.bar.tab.values()
        )
        self.config(bg=self.bg)

        self.icon = Icon(
            self,
            Icons.FILE,
            iconsize=12,
            **self.base.theme.layout.content.editors.bar.tab.icon,
        )
        self.icon.pack(side=tk.LEFT, padx=5, fill=tk.Y)

        self.name = tk.Label(
            self,
            text=(
                f"{editor.filename} (working tree)" if editor.diff else editor.filename
            ),
            padx=5,
            font=self.base.settings.uifont,
            bg=self.bg,
            fg=self.fg,
        )
        self.name.pack(side=tk.LEFT)

        self.closebtn = IconButton(
            self,
            Icons.CLOSE,
            iconsize=12,
            event=self.close,
        )
        self.closebtn.config(**self.base.theme.layout.content.editors.bar.tab.close)
        self.closebtn.pack(side=tk.RIGHT, fill=tk.Y)

        self.bind("<Button-1>", self.select)
        self.name.bind("<Button-1>", self.select)

        self.bind("<Enter>", self.on_hover)
        self.bind("<Leave>", self.off_hover)

    def close(self, *_) -> None:
        self.master.close_tab(self)

    def apply_color(self, color: str) -> None:
        self.icon.config(bg=color)
        self.name.config(bg=color)
        self.config(bg=color)
        self.closebtn.config(bg=color)

    def on_hover(self, *_) -> None:
        if not self.selected:
            self.apply_color(self.hbg)
            self.closebtn.config(activeforeground=self.hfg, fg=self.fg)
            self.hovered = True

    def off_hover(self, *_) -> None:
        if not self.selected:
            self.apply_color(self.bg)
            self.closebtn.config(activeforeground=self.fg, fg=self.bg)
            self.hovered = False

    def deselect(self, *_) -> None:
        if self.selected:
            self.apply_color(self.bg)
            self.closebtn.config(activeforeground=self.fg, fg=self.bg)
            self.selected = False

    def select(self, *_) -> None:
        editors_manager = self.master.master

        if self.selected:
            if (
                self.editor.path
                and self.editor.exists
                and self.editor.showpath
                and not self.editor.diff
            ):
                self.master.show_breadcrumbs()
                self.base.breadcrumbs.set_path(self.editor.path)
            else:
                self.master.hide_breadcrumbs()
            return

        self.master.set_active_tab(self)

        target_pane = editors_manager.active_pane
        for pane in editors_manager.panes:
            if pane.active_editor == self.editor:
                target_pane = pane
                break

        target_pane.set_active_editor(self.editor)
        editors_manager.set_active_pane(target_pane)

        if self.base.active_directory and self.editor.filename:
            self.base.set_title(
                f"{self.editor.filename} - {os.path.basename(self.base.active_directory)}"
            )
        elif self.editor.filename:
            self.base.set_title(self.editor.filename)

        self.apply_color(self.hbg)
        self.closebtn.config(activeforeground=self.hfg, fg=self.fg)
        self.selected = True

        if (
            self.editor.path
            and self.editor.exists
            and self.editor.showpath
            and not self.editor.diff
        ):
            self.master.show_breadcrumbs()
            self.base.breadcrumbs.set_path(self.editor.path)
        else:
            self.master.hide_breadcrumbs()
