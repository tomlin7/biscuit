import tkinter as tk

from src.biscuit.common.ui import Toplevel
from src.biscuit.views.explorer import DirectoryTree


class PathView(Toplevel):
    """PathView is a floating window that displays the directory tree of a path.
    PathView is used with the breadcrumbs to display the directory structure of a file.
    User can navigate the tree and open files in the editor.
    """

    def __init__(self, master, width=150, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.width = round(width * self.base.scale)

        self.tree = DirectoryTree(
            self, width=width, observe_changes=False, itembar=False
        )
        self.tree.pack()

        self.config(pady=1, padx=1, bg=self.base.theme.border)
        self.overrideredirect(True)
        self.withdraw()

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        self.configure_bindings()

    def configure_bindings(self) -> None:
        self.bind("<FocusOut>", self.hide)
        self.bind("<Escape>", self.hide)

    def get_popup_x(self, width) -> int:
        return self.winfo_rootx() + int(self.winfo_width() / 2) - int(width / 2)

    def get_popup_y(self) -> int:
        return self.winfo_rooty()

    def hide(self, *_) -> None:
        self.withdraw()

    def show(self, w: tk.Widget) -> None:
        self.update_idletasks()
        x = w.winfo_rootx()
        y = w.winfo_rooty() + w.winfo_height()

        if not w.path:
            return
        self.tree.change_path(w.path)
        self.geometry(f"+{x}+{y}")
        self.deiconify()
        self.lift()
        self.focus_set()
