from __future__ import annotations

import os
import tkinter as tk
import typing
from tkinter.messagebox import askyesno

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, IconButton
from biscuit.editor import BreadCrumbs, Editor
from biscuit.layout.editors.menu import EditorsbarMenu
from biscuit.layout.editors.placeholder import Placeholder
from biscuit.layout.editors.tab import Tab

if typing.TYPE_CHECKING:
    from .manager import EditorsManager


class EditorPane(Frame):
    def __init__(self, master, editors_manager: EditorsManager, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.editors_manager = editors_manager
        self.config(bg=self.base.theme.border)

        self.grid_rowconfigure(2, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self._build_tab_bar()

        self.breadcrumbs_container = Frame(self)
        self.breadcrumbs_container.grid(row=1, column=0, sticky=tk.EW)

        self.breadcrumbs = BreadCrumbs(self.breadcrumbs_container)
        self.breadcrumbs.pack(fill=tk.X, side=tk.TOP)
        self.breadcrumbs_container.grid_remove()

        self.editor_container = Frame(self)
        self.editor_container.grid(row=2, column=0, sticky=tk.NSEW)
        self.editor_container.grid_rowconfigure(0, weight=1)
        self.editor_container.grid_columnconfigure(0, weight=1)

        self.active_tabs: list[Tab] = []
        self.active_tab: Tab | None = None
        self.active_editor: Editor | None = None

        self.placeholder = Placeholder(self.editor_container)
        self.placeholder.grid(row=0, column=0, sticky=tk.NSEW)

        self.bind("<Button-1>", self.focus_pane)
        self.placeholder.bind("<Button-1>", self.focus_pane)
        self.tab_bar.grid_remove()

    def _build_tab_bar(self) -> None:
        self.tab_bar = Frame(self, **self.base.theme.layout.content.editors.bar)
        self.tab_bar.grid(row=0, column=0, sticky=tk.EW)

        self.tab_container = Frame(self.tab_bar, bg=self.base.theme.border)
        self.tab_container.pack(side=tk.LEFT, fill=tk.Y)

        self.action_container = Frame(
            self.tab_bar, **self.base.theme.layout.content.editors.bar
        )
        self.action_container.pack(side=tk.RIGHT, fill=tk.Y, padx=(0, 10))

        self.menu = EditorsbarMenu(self.action_container, "tabs")
        self.menu.add_command(
            "Show Opened Editors", lambda: self.base.palette.show("active:")
        )
        self.menu.add_command(
            "Restore Last Closed Editor",
            self.base.commands.restore_last_closed_editor,
        )
        self.menu.add_separator(10)
        self.menu.add_command("Split Editor", self.split_pane)
        self.menu.add_command(
            "Split Editor Vertical", self.split_pane_vertical
        )
        self.menu.add_separator(10)
        self.menu.add_command(
            "Close Split",
            lambda: self.editors_manager.close_pane(self),
        )
        self.menu.add_command("Close All", self.editors_manager.delete_all_editors)

        self.buttons: list[IconButton] = []
        default_buttons = (
            (Icons.ELLIPSIS, self.menu.show),
            (Icons.CHEVRON_DOWN, self.base.open_editors.show),
            (Icons.ADD, self.add_empty_editor),
        )

        for button in default_buttons:
            if isinstance(button, list | tuple):
                IconButton(
                    self.action_container, iconsize=12, pady=6, hfg_only=True, *button
                ).pack(side=tk.RIGHT, fill=tk.Y)
            else:
                IconButton(self.action_container, **button).pack(
                    side=tk.RIGHT, fill=tk.Y
                )

        IconButton(
            self.action_container,
            Icons.SPLIT_HORIZONTAL,
            iconsize=12,
            pady=6,
            hfg_only=True,
            event=self.split_pane,
        ).pack(side=tk.RIGHT, fill=tk.Y)

    def _update_tab_bar_visibility(self) -> None:
        if self.active_tabs:
            self.tab_bar.grid()
        else:
            self.tab_bar.grid_remove()
            self.breadcrumbs_container.grid_remove()

    def show_breadcrumbs(self) -> None:
        self.breadcrumbs.clear()
        self.breadcrumbs_container.grid()

    def hide_breadcrumbs(self) -> None:
        self.breadcrumbs_container.grid_remove()

    def focus_pane(self, *_) -> None:
        self.editors_manager.set_active_pane(self)

    def add_empty_editor(self, *_) -> None:
        self.focus_pane()
        self.base.commands.new_file()

    def split_pane(self, *_) -> None:
        self.focus_pane()
        self.editors_manager._split_pane(self, tk.HORIZONTAL)

    def split_pane_vertical(self, *_) -> None:
        self.focus_pane()
        self.editors_manager._split_pane(self, tk.VERTICAL)

    def is_empty(self) -> bool:
        return not self.active_tabs

    def set_active_tab(self, tab: Tab) -> None:
        self.active_tab = tab
        for t in self.active_tabs:
            if t != tab:
                t.deselect()

    def set_active_editor(self, editor: Editor | None) -> None:
        if self.active_editor and self.active_editor != editor:
            try:
                self.active_editor.grid_remove()
            except tk.TclError:
                pass

        if editor:
            try:
                editor.grid(row=0, column=0, sticky=tk.NSEW, in_=self.editor_container)
            except tk.TclError:
                pass
            try:
                editor.tkraise()
            except tk.TclError:
                pass
            self.placeholder.grid_remove()
        else:
            self.placeholder.grid()
        self.active_editor = editor

    def add_tab(self, editor: Editor) -> Tab:
        tab = Tab(self, editor)
        tab.pack(fill=tk.Y, side=tk.LEFT, padx=(0, 1), in_=self.tab_container)
        self.active_tabs.append(tab)
        tab.select()
        self._update_tab_bar_visibility()
        return tab

    def close_tab(self, tab: Tab) -> None:
        if e := tab.editor:
            if e.content and e.content.editable and e.content.unsaved_changes:
                if askyesno(
                    "Unsaved changes",
                    f"Do you want to save the changes you made to {e.filename}",
                ):
                    if e.exists:
                        e.save()
                    else:
                        self.base.commands.save_file_as()

        try:
            i = self.active_tabs.index(tab)
        except ValueError:
            return

        was_selected = tab == self.active_tab
        self.active_tabs.pop(i)
        self.editors_manager.close_editor(tab.editor)
        tab.destroy()

        self._update_tab_bar_visibility()

        if not self.active_tabs and len(self.editors_manager.panes) > 1:
            self.after_idle(lambda p=self: p.editors_manager.close_pane(p))
            return

        if not was_selected:
            return

        if self.active_tabs:
            if i < len(self.active_tabs):
                self.active_tabs[i].select()
            else:
                self.active_tabs[i - 1].select()
        else:
            self.active_tab = None

    def close_active_tab(self) -> None:
        if self.active_tab:
            self.close_tab(self.active_tab)

    def change_tab_forward(self) -> None:
        if self.active_tab:
            i = self.active_tabs.index(self.active_tab)
            self.active_tabs[(i + 1) % len(self.active_tabs)].select()

    def change_tab_back(self) -> None:
        if self.active_tab:
            i = self.active_tabs.index(self.active_tab)
            self.active_tabs[(i - 1) % len(self.active_tabs)].select()

    def clear_tabs(self) -> None:
        for tab in self.active_tabs:
            tab.destroy()
        self.active_tabs.clear()
        self.active_tab = None
        self._update_tab_bar_visibility()

    def clear(self) -> None:
        self.active_editor = None
        self.placeholder.grid()

    def add_buttons(self, buttons: list[IconButton]) -> None:
        for button in buttons:
            button.pack(side=tk.LEFT)
            self.buttons.append(button)

    def replace_buttons(self, buttons: list[IconButton]) -> None:
        self.clear_buttons()
        self.add_buttons(buttons)

    def clear_buttons(self) -> None:
        for button in self.buttons:
            button.pack_forget()
        self.buttons.clear()
