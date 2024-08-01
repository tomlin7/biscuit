import tkinter as tk

from biscuit.common.ui import Closable

from ..sidebar_item import SideBarViewItem


class OpenEditors(SideBarViewItem):
    """View that displays the open editors in the editor tabs.

    The OpenEditors view displays the open editors in the editor tabs.
    - The user can switch between open editors, close the editors."""

    def __init__(self, master, startpath=None, itembar=True, *args, **kwargs) -> None:
        self.title = "Open Editors"
        self.__actions__ = (("new-file", lambda: self.base.palette.show("newfile:")),)
        super().__init__(master, itembar=itembar, *args, **kwargs)
        self.path = startpath
        self.nodes = {}

    def refresh(self):
        if not self.nodes:
            self.itembar.hide_content()
        else:
            self.itembar.show_content()
        self.update()

    def add_item(self, editor):
        temp = Closable(
            self.content,
            text=editor.filename or editor.path,
            callback=lambda p=editor.path: self.openfile(p),
            closefn=lambda p=editor.path: self.closefile(p),
            padx=10,
        )
        try:
            temp.text_label.config(anchor=tk.W)
        except AttributeError:
            pass

        temp.pack(fill=tk.X, expand=True)

        self.nodes[editor.path] = temp
        self.refresh()

    def remove_item(self, editor):
        if not self.nodes:
            return

        e = self.nodes.pop(editor.path)
        e.pack_forget()
        e.destroy()
        self.refresh()

    def set_active(self, editor):
        # TODO: set highlight, clear highlight on others
        ...

    def clear(self):
        for node in self.nodes.values():
            node.destroy()
        self.nodes = {}
        self.refresh()

    def openfile(self, path) -> None:
        self.base.editorsmanager.editorsbar.switch_tabs(path)

    def closefile(self, path) -> None:
        e = self.base.editorsmanager.close_editor_by_path(path)
        self.base.editorsmanager.editorsbar.close_tab_helper(e)
