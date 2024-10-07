import tkinter as tk

from biscuit.common.ui import Closable, Frame
from biscuit.common.ui.native import Label, Toplevel


class OpenEditors(Toplevel):
    """Toplevel view that displays the open editors in the editor tabs.

    The OpenEditors view displays the open editors in the editor tabs.
    - The user can switch between open editors, close the editors."""

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)
        self.overrideredirect(True)
        self.nodes = {}
        self.withdraw()

        self.container = Frame(self)
        self.container.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)

        Label(
            self.container,
            text="Opened Editors",
            font=self.base.settings.uifont,
            padx=10,
            pady=5,
            **self.base.theme.utils.label,
        ).pack(fill=tk.X, expand=True, anchor=tk.W)

        self.bind("<FocusOut>", lambda _: self.hide())

    def show(self, e: tk.Event) -> None:
        btn = e.widget
        x, y = (
            btn.winfo_rootx() - self.winfo_width() + btn.winfo_width(),
            btn.winfo_rooty() + btn.winfo_height(),
        )
        self.geometry(f"+{x}+{y}")
        self.deiconify()
        self.update()
        self.focus_force()

    def hide(self) -> None:
        self.withdraw()

    def add_item(self, editor):
        temp = Closable(
            self.container,
            text=editor.filename or editor.path,
            callback=lambda p=editor.path: self.openfile(p),
            closefn=lambda p=editor.path: self.closefile(p),
        )
        try:
            temp.text_label.config(anchor=tk.W)
        except AttributeError:
            pass

        temp.pack(fill=tk.X, expand=True)
        self.nodes[editor.path] = temp
        self.update()

    def remove_item(self, editor):
        if not self.nodes:
            return

        e = self.nodes.pop(editor.path)
        e.pack_forget()
        e.destroy()
        self.update()

    def set_active(self, editor):
        # TODO: set highlight, clear highlight on others
        ...

    def clear(self):
        for node in self.nodes.values():
            node.destroy()
        self.nodes = {}

    def openfile(self, path) -> None:
        self.base.editorsmanager.editorsbar.switch_tabs(path)

    def closefile(self, path) -> None:
        e = self.base.editorsmanager.close_editor_by_path(path)
        self.base.editorsmanager.editorsbar.close_tab_helper(e)
