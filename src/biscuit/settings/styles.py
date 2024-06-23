import tkinter as tk
from tkinter import ttk


class Style(ttk.Style):
    """Handles the styling of the app"""

    def __init__(self, master, theme, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
        self.theme = theme

        self.configure("TCheckbutton", background=self.theme.editors.background)
        self.configure("TFrame", background=self.theme.editors.background)
        self.gen_fileicons()

        self.configure(
            "Treeview.treearea",
            font=("Segoe UI", 10),
            relief="flat",
            rowheight=25,
            highlightthickness=0,
            bd=0,
            **self.theme.utils.tree.item,
            padding=0,
        )
        self.configure(
            "Treeview",
            font=("Segoe UI", 10),
            relief="flat",
            rowheight=25,
            highlightthickness=0,
            bd=0,
            **self.theme.utils.tree.item,
            padding=0,
        )

        self.layout("Treeview", [("Treeview.treearea", {"sticky": "nswe"})])

        self.config_tree_scrollbar()

    def config_tree_scrollbar(self) -> None:
        self.element_create("TreeScrollbar.trough", "from", "clam")
        self.element_create("TreeScrollbar.thumb", "from", "clam")

        self.layout(
            "TreeScrollbar",
            [
                (
                    "TreeScrollbar.trough",
                    {
                        "sticky": "ns",
                        "children": [
                            ("TreeScrollbar.thumb", {"unit": "1", "sticky": "nsew"})
                        ],
                    },
                )
            ],
        )

        bg, _, highlight, _ = self.theme.utils.scrollbar.values()
        self.configure(
            "TreeScrollbar",
            gripcount=0,
            background=bg,
            troughcolor=bg,
            bordercolor=bg,
            lightcolor=bg,
            darkcolor=bg,
            arrowsize=14,
        )
        self.map(
            "TreeScrollbar",
            background=[("pressed", highlight), ("!disabled", self.theme.border)],
        )

        self.element_create("EditorScrollbar.trough", "from", "clam")
        self.element_create("EditorScrollbar.thumb", "from", "clam")

        self.layout(
            "EditorScrollbar",
            [
                (
                    "EditorScrollbar.trough",
                    {
                        "sticky": "nsew",
                        "children": [("EditorScrollbar.thumb", {"sticky": "nsew"})],
                    },
                )
            ],
        )
        self.configure(
            "EditorScrollbar",
            gripcount=0,
            background=bg,
            troughcolor=bg,
            bordercolor=bg,
            lightcolor=bg,
            darkcolor=bg,
        )
        self.map(
            "EditorScrollbar",
            background=[("pressed", highlight), ("!disabled", self.theme.border)],
        )

    def gen_fileicons(self) -> None:
        self.document_icn = tk.PhotoImage(
            "document",
            data="""
        iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAJ2AAACdgBx6C5rQA
        AABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADlSURBVDiNpZGxTgJBFEXPW9aGCRTYWht+wyVEEuq1md
        7Exm/A2NjxFUvBD1CQ7JZWlOhXQCNsoYnPajZk3Zks4VaTmfvOO8nAhRF3SJfa2X2XLwi39ZIi74XtzoOA0eIwUZVVQ+cDu
        AHmuTWz+mNUbdGo57HcKiTAc5KVb15AKIU1G4Ux6GMd0grgICIyBX26yw737j5uMZsm2VEBVBUAIeqfbeDLP4PcGmkqujgb
        LyDJjsuLDAJJWwFyax6ainV1L8BX9KX6BZHfr7ZDp93KYBCb9f6nfFUYhoZV+by+MutzLIP5A16TRi/mS3m5AAAAAElFTkS
        uQmCC
        """,
        )

        self.folder_icn = tk.PhotoImage(
            "foldericon",
            data="""
        iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAYAAABr5z2BAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB
        3d3cuaW5rc2NhcGUub3Jnm+48GgAAAJBJREFUKJHdzTEKwkAUhOF/loCFRbAVr+IhLAWLCPaW3sFGPIOm1Bt4hxSSEwRs7Z
        UdayErmnROO++bp93htJK0BUa8pxEq1ovZhQ/R/ni+G/LWEjW2y4Stx4NnmUU7l9R6YTxBbFLfb49sGlL4m9ieh84aAA17D
        sCfDLiHdwDqrlpwDTHGAqiA+IONQIW0fAFkySdEGFdeCgAAAABJRU5ErkJggg==""",
        )
