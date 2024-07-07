import tkinter as tk
import tkinter.ttk as ttk

from .native import Frame
from .scrollbar import Scrollbar


class Tree(Frame):
    """Treeview with an auto hiding scrollbar

    Args:
        master (tk.Widget): Parent widget
        startpath (str, optional): Starting path for the tree.
        doubleclick (function, optional): Function to call on double click. Defaults to lambda _: None.
        singleclick (function, optional): Function to call on single click. Defaults to lambda _: None.
        columns (tuple, optional): Columns to display. Defaults to ("fullpath", "type").
    """

    def __init__(
        self,
        master,
        startpath="",
        doubleclick=lambda _: None,
        singleclick=lambda _: None,
        columns=("fullpath", "type"),
        style="",
        *args,
        **kwargs
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(**self.base.theme.utils.tree)

        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.path = startpath
        self.doubleclick = doubleclick
        self.singleclick = singleclick

        self.tree = ttk.Treeview(
            self,
            show="tree",
            columns=columns,
            displaycolumns="",
            style=style,
            selectmode=tk.BROWSE,
        )
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)

        self.scrollbar = Scrollbar(
            self, orient=tk.VERTICAL, command=self.tree.yview, style="TreeScrollbar"
        )
        self.scrollbar.grid(row=0, column=1, sticky=tk.NS)

        self.tree.config(yscrollcommand=self.scrollbar.set)
        self.scrollbar.config(command=self.tree.yview)

        self.bind("<Double-Button-1>", self.doubleclick)
        self.bind("<<TreeviewSelect>>", self.check_singleclick)

        # self.tree.bind("<Motion>", self.on_motion)
        # self.tree.bind("<Leave>", self.on_leave)
        # self.tree.tag_configure("hover", background=self.base.theme.border)
        # self.hovered = None

    def on_motion(self, event):
        try:
            self.item(self.hovered, tags=())
        except tk.TclError:
            pass

        item = self.identify_row(event.y)
        try:
            self.item(item, tags=("hover",))
            self.hovered = item
        except tk.TclError:
            pass

    def on_leave(self, _):
        if self.hovered:
            try:
                self.item(self.hovered, tags=())
            except tk.TclError:
                pass
            self.hovered = None

    def bind(self, *args, **kwargs) -> None:
        self.tree.bind(*args, **kwargs)

    def check_singleclick(self, _) -> None:
        if self.item_type(self.focus()) == "file":
            if self.singleclick:
                self.singleclick(self.item_fullpath(self.focus()))
        else:
            self.toggle_node(self.focus())

    def clear_node(self, node) -> None:
        self.tree.delete(*self.tree.get_children(node))

    def clear_tree(self) -> None:
        self.clear_node("")

    def collapse_all(self) -> None:
        for node in self.tree.get_children():
            self.tree.item(node, open=False)

    def delete(self, *a, **kw) -> None:
        self.tree.delete(*a, *kw)

    def focus(self, *args) -> str:
        return self.tree.focus(*args) or ""

    def get_children(self, *a, **kw) -> str:
        return self.tree.get_children(*a, **kw)

    def identify_row(self, y) -> str:
        return self.tree.identify_row(y)

    def insert(self, *args, **kwargs):
        try:
            return self.tree.insert(*args, **kwargs)
        except tk.TclError:
            return None

    def add(self, *a, **kw):
        return self.tree.insert("", "end", *a, **kw)

    def is_open(self, node):
        return self.tree.item(node, "open")

    def item(self, *a, **kw):
        return self.tree.item(*a, **kw)

    def item_type(self, item):
        return self.set(item, "type")

    def item_fullpath(self, item):
        return self.set(item, "fullpath")

    def parent(self, *args, **kwargs):
        return self.tree.parent(*args, **kwargs)

    def parent_selected(self):
        return self.parent(self.focus())

    def selected_parent_path(self):
        return self.item_fullpath(self.parent_selected())

    def selection_set(self, *args, **kwargs):
        return self.tree.selection_set(*args, **kwargs)

    def selected_path(self):
        return self.item_fullpath(self.focus())

    def selected_type(self):
        return self.item_type(self.focus())

    def is_file_selected(self):
        return self.selected_type() == "file"

    def is_directory_selected(self):
        return self.selected_type() == "directory"

    def set(self, *args, **kwargs):
        return self.tree.set(*args, **kwargs)

    def toggle_node(self, node) -> None:
        if self.item_type(node) == "directory":
            if self.is_open(node):
                self.tree.item(node, open=False)
            else:
                self.tree.item(node, open=True)
                self.tree.event_generate("<<Open>>")
