from __future__ import annotations

import tkinter as tk
import typing
from pathlib import Path

from git import Submodule

from biscuit.common.ui import Frame, HoverChangeButton, Label

if typing.TYPE_CHECKING:
    from .results import Results


class ExtensionGUI(Frame):
    """Extension item in the Extensions view.

    The Extension class represents an extension item in the Extensions view.
    """

    def __init__(
        self, master: Results, name: str, data: list[str], *args, **kwargs
    ) -> None:
        """Initialize the Extension class.

        Args:
            master (tk.Tk): The root window.
            name (str): The name of the extension.
            data (list): The extension data."""

        super().__init__(master, *args, **kwargs)
        self.master: Results = master
        self.config(**self.base.theme.views.sidebar.item)
        self.manager = self.base.extensions_manager

        self.partial_id = name
        self.data = data

        # sample data
        # ----------------
        # submodule = "rust"
        # name = "Rust"
        # author = "tomlin7"
        # description = "Rust language support"
        # version = "0.1.0"

        self.id = data["submodule"]
        self.display_name = data["name"]
        self.author = data["author"]
        self.description = data["description"]
        self.version = data["version"]

        self.submodule_name = f"extensions/{self.id}"
        self.submodule_repo = s = self.manager.extensions_repository.get_submodule(
            self.submodule_name
        )

        # TODO: don't do this here, do it when install is called
        self.submodule_repo = Submodule(
            s.repo,
            s.binsha,
            s.mode,
            s.path,
            s.name,
            s.parent_commit,
            s.url,
            # hack to get gitpython working with our setup
            # since gitpython is stupid and doesn't let us modify the default target branch easily
            # i.e it has default=`master` and we use `main`
            "refs/heads/main",
        )

        self.path = Path(self.base.extensiondir) / "extensions" / self.id
        self.entry_point = self.path / "extension.py"

        # GUI ----------------
        self.selected = False
        self.bg = self.base.theme.views.sidebar.item.background
        self.hbg = self.base.theme.views.sidebar.item.highlightbackground

        self.container = Frame(self, padx=10, pady=10)
        self.container.pack(fill=tk.BOTH, expand=True)

        self.namelbl = Label(
            self.container,
            text=name[0].upper() + name[1:],
            font=("Segoi UI", 11, "bold"),
            anchor=tk.W,
            **self.base.theme.views.sidebar.item.content,
        )
        self.namelbl.pack(fill=tk.X)

        self.descriptionlbl = Label(
            self.container,
            text=(
                self.description[:31] + "..."
                if len(self.description) >= 30
                else self.description
            ),
            font=("Segoi UI", 9),
            anchor=tk.W,
            **self.base.theme.views.sidebar.item.content,
        )
        self.descriptionlbl.config(fg="grey")
        self.descriptionlbl.pack(fill=tk.X, expand=True)

        self.subcontainer = Frame(self.container)
        self.subcontainer.pack(side=tk.BOTTOM, fill=tk.X, expand=True)

        self.authorlbl = Label(
            self.subcontainer,
            text=f"@{self.author}",
            font=("Segoi UI", 7, "bold"),
            anchor=tk.W,
            **self.base.theme.views.sidebar.item.content,
        )
        self.authorlbl.config(fg="grey")
        self.authorlbl.pack(side=tk.LEFT, fill=tk.X)

        self.install = HoverChangeButton(self.subcontainer, "Install", padx=10)
        self.install.config(font=("Segoi UI", 8), pady=2)
        self.install.pack(side=tk.RIGHT, fill=tk.X)
        
        if self.installed:
            self.set_installed()
        else:
            self.set_uninstalled()

        self.bind("<Button-1>", self.set_selected)
        self.namelbl.bind("<Button-1>", self.set_selected)
        self.descriptionlbl.bind("<Button-1>", self.set_selected)
        self.authorlbl.bind("<Button-1>", self.set_selected)
        self.container.bind("<Button-1>", self.set_selected)
        self.subcontainer.bind("<Button-1>", self.set_selected)

        self.bind("<Enter>", self.hoverin)
        self.bind("<Leave>", self.hoveroff)
        self.hoveroff()

    @property
    def installed(self):
        return self.submodule_repo and self.submodule_repo.module_exists() and (
            (self.manager.extension_dir / f"extensions/{self.id}/.git").exists()
        )

    def uninstall_extension(self, *_):
        self.manager.uninstall_extension(self)

    def install_extension(self, *_):
        self.manager.install_extension(self)

    def set_unavailable(self):
        self.install.text = "Error"
        self.install.hovertext = "Retry"
        self.install.config(
            text="Error", bg=self.base.theme.border, activebackground=self.base.theme.biscuit
        )

    def set_installed(self):
        self.install.set_command(self.uninstall_extension)

        self.install.text = "Installed"
        self.install.hovertext = "Uninstall"
        self.install.config(
            text="Installed",
            bg=self.base.theme.border,
            activebackground="#c61c1c",
        )

    def set_uninstalled(self):
        self.install.set_command(self.install_extension)

        self.install.config(
            text="Install", bg=self.base.theme.biscuit, activebackground=self.base.theme.biscuit
        )
        self.install.text = "Install"
        self.install.hovertext = None

    def set_fetching(self):
        self.install.config(text="Fetching...", bg=self.base.theme.biscuit_dark)

    def set_selected(self, *_):
        self.master.set_selected(self)

    def select(self):
        self.selected = True
        self.config(bg=self.hbg)
        self.namelbl.config(bg=self.hbg)
        self.authorlbl.config(bg=self.hbg)
        self.descriptionlbl.config(bg=self.hbg)
        self.container.config(bg=self.hbg)
        self.subcontainer.config(bg=self.hbg)

    def deselect(self):
        self.selected = False
        self.config(bg=self.bg)
        self.namelbl.config(bg=self.bg)
        self.authorlbl.config(bg=self.bg)
        self.descriptionlbl.config(bg=self.bg)
        self.container.config(bg=self.bg)
        self.subcontainer.config(bg=self.bg)

    def hoverin(self, *_) -> None:
        if self.selected:
            return

        try:
            self.config(bg=self.hbg)
            self.namelbl.config(bg=self.hbg)
            self.authorlbl.config(bg=self.hbg)
            self.descriptionlbl.config(bg=self.hbg)
            self.container.config(bg=self.hbg)
            self.subcontainer.config(bg=self.hbg)
        except:
            pass

    def hoveroff(self, *_) -> None:
        if self.selected:
            return

        try:
            self.config(bg=self.bg)
            self.namelbl.config(bg=self.bg)
            self.authorlbl.config(bg=self.bg)
            self.descriptionlbl.config(bg=self.bg)
            self.container.config(bg=self.bg)
            self.subcontainer.config(bg=self.bg)
        except:
            pass

