from __future__ import annotations

import tkinter as tk
import typing
from tkinter import ttk
from tkinter.font import Font

if typing.TYPE_CHECKING:
    from .settings import Settings


class Style(ttk.Style):
    """Handles the styling of the app"""

    def __init__(self, settings: Settings, *args, **kwargs) -> None:
        super().__init__(settings.base, *args, **kwargs)
        self.settings = settings
        self.base = settings.base
        self.theme = settings.config.theme

        self.configure(
            "TCheckbutton",
            background=self.theme.editors.background,
            font=self.settings.uifont,
        )
        self.configure("TFrame", background=self.theme.editors.background)
        self.gen_fileicons()

        self.config_treeview()
        self.config_tree_scrollbar()

    def config_treeview(self) -> None:

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

        self.monofont = Font(family=self.settings.config.font[0], size=10)
        self.layout("mono.Treeview", [("Treeview.treearea", {"sticky": "nswe"})])
        self.configure(
            "mono.Treeview.treearea",
            font=self.monofont,
            relief="flat",
            rowheight=25,
            highlightthickness=0,
            bd=0,
            **self.theme.utils.tree.item,
            padding=0,
        )
        self.configure(
            "mono.Treeview",
            font=self.monofont,
            relief="flat",
            rowheight=25,
            highlightthickness=0,
            bd=0,
            **self.theme.utils.tree.item,
            padding=0,
        )

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
