from __future__ import annotations

import tkinter as tk
import typing
import webbrowser

import mistune
from tkinterweb import HtmlFrame

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, Label, LinkLabel, Scrollbar
from biscuit.common.ui.buttons import Button, IconLabelButton
from biscuit.common.ui.native import Toplevel

if typing.TYPE_CHECKING:
    from biscuit.views.extensions.extension import ExtensionGUI


class ExtensionViewer(Toplevel):
    """Extension Viewer

    Extension Viewer displays the details of an extension.
    """

    def __init__(
        self,
        master,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.ext: ExtensionGUI = None
        self.withdraw()
        self.config(bg=self.base.theme.border, padx=1, pady=1)
        self.overrideredirect(True)

        container = Frame(self, padx=10, pady=10)
        title = Frame(container)

        self.name = Label(title, text="Extension", fg=self.base.theme.biscuit)
        self.name.config(font=(self.base.settings.font["family"], 16, "bold"))
        self.version = Label(title, text="v1.0.0", fg=self.base.theme.border)
        self.version.config(font=(self.base.settings.font["family"], 10, "bold"))

        self.install = Button(
            title,
            "Install",
            padx=10,
        )
        self.install.config(font=("Segoi UI", 10), pady=2)

        title.pack(side=tk.TOP, fill=tk.X, pady=10)
        self.name.pack(side=tk.LEFT, fill=tk.X, padx=(0, 5))
        self.version.pack(side=tk.LEFT, fill=tk.X)
        self.install.pack(side=tk.RIGHT, fill=tk.X)

        Label(container, text="…" * 100, fg=self.base.theme.border).pack(
            side=tk.TOP, fill=tk.X, pady=5
        )

        self.author = Label(
            container, text=f"Tommy", fg=self.base.theme.primary_foreground
        )
        self.author.config(font=self.base.settings.uifont)
        self.description = Label(
            container, text=f"Hello, world!", fg=self.base.theme.primary_foreground
        )
        self.description.config(font=self.base.settings.uifont)

        self.author.pack(side=tk.TOP, anchor=tk.W, pady=5)
        self.description.pack(side=tk.TOP, anchor=tk.W, pady=5)

        container.pack(
            side=tk.LEFT, fill=tk.BOTH, expand=True, pady=(0, 5), padx=(0, 5)
        )

        self.bind("<Escape>", lambda _: self.hide())
        self.bind("<FocusOut>", lambda _: self.hide())

    def show(self, ext: ExtensionGUI) -> None:
        self.ext = ext
        self.name.config(text=ext.display_name)
        self.version.config(text=f"v0.1.0")
        self.author.config(text=f"by @{ext.author}")
        self.description.config(text=ext.description)

        if ext.installed:
            self.install.config(text="Installed", bg=self.base.theme.biscuit_dark)
            self.install.set_command(ext.uninstall_extension)
        else:
            self.install.config(text="Install", bg=self.base.theme.biscuit)
            self.install.set_command(ext.install_extension)

        self.deiconify()
        self.focus_set()

        self.geometry(
            f"500x300+{self.winfo_screenwidth() // 2 - 250}+{self.winfo_screenheight() // 2 - 150}"
        )

    def hide(self) -> None:
        self.withdraw()
        self.ext = None
