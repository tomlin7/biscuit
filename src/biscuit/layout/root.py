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

from biscuit.common.ui import Frame, PanedWindow
from biscuit.common.ui.vimbar import VimBar
from biscuit.layout.statusbar import activitybar  # noqa: F401

from .content import *  # noqa: F403
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
        self.config(bg=self.base.theme.primary_background)

        container = Frame(self, bg=self.base.theme.border)

        self.menubar = Menubar(container)
        self.statusbar = Statusbar(container)
        self.vimbar = VimBar(container)

        self.subcontainer = PanedWindow(
            container, orient=tk.HORIZONTAL, bg=self.base.theme.border,
            bd=0, sashwidth=3, sashpad=0, opaqueresize=False,
        )
        self.content = Content(self.subcontainer)  # noqa: F405
        self.sidebar = SideBar(self.subcontainer, activitybar=self.statusbar.activitybar)
        self.secondary_sidebar = SecondarySideBar(
            self.subcontainer, activitybar=self.statusbar.secondary_activitybar
        )

        container.pack(fill=tk.BOTH, expand=True)

        self.menubar.pack()
        self.subcontainer.pack(fill=tk.BOTH, expand=True)
        self.statusbar.pack()

        self.content.pack(padx=1)
        self.pack(fill=tk.BOTH, expand=True)

        # Expose vimbar on base for global access
        self.base.vimbar = self.vimbar

    def toggle_sidebar(self) -> None:
        self.sidebar.toggle()
