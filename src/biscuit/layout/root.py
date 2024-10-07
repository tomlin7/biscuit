"""Layout

Contains the layout of the application. It is divided into 3 main parts:

Root
├── Menubar
├── <Container>
│  ├── Sidebar (Explorer, Search, Source Control, etc.)
│  └── Content
│     ├── Editors
│     └── Panel (Terminals, Logs, Problems, etc.)
└── StatusBar

The layout is designed to be modular and flexible. Each part can be easily replaced or modified.
Extensions can easily access and modify the layout.
"""

from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common.ui import Frame
from biscuit.layout.statusbar import activitybar

from .content import *
from .grip import Grip
from .menubar import Menubar
from .secondary_sidebar import SecondarySideBar
from .sidebar import SideBar
from .statusbar import Statusbar

if typing.TYPE_CHECKING:
    from ..app import App


class Root(Frame):
    """Root of the application

    - Contains the Menubar, Sidebar, Content Pane, and StatusBar
    - Manages the resizing of the application
    """

    def __init__(self, base: App, *args, **kwargs) -> None:
        super().__init__(base, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        container = Frame(self, bg=self.base.theme.border)

        self.menubar = Menubar(container)
        self.statusbar = Statusbar(container)

        subcontainer = Frame(container, bg=self.base.theme.border)
        self.content = Content(subcontainer)
        self.sidebar = SideBar(subcontainer, activitybar=self.statusbar.activitybar)
        self.secondary_sidebar = SecondarySideBar(
            subcontainer, activitybar=self.statusbar.secondary_activitybar
        )

        # Window Resizing Grips
        grip_w = Grip(self, "w", "left_side")
        grip_e = Grip(self, "e", "right_side")
        grip_n = Grip(container, "n", "top_side")
        grip_s = Grip(container, "s", "bottom_side")

        grip_w.pack(fill=tk.Y, side=tk.LEFT)
        container.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)
        grip_e.pack(fill=tk.Y, side=tk.LEFT)

        grip_n.pack(fill=tk.X)
        self.menubar.pack()
        subcontainer.pack(fill=tk.BOTH, expand=True, pady=(1, 0))
        self.statusbar.pack()
        grip_s.pack(fill=tk.X)

        self.content.pack()
        self.pack(fill=tk.BOTH, expand=True)

    def toggle_sidebar(self) -> None:
        self.sidebar.toggle()
