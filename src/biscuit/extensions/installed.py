from __future__ import annotations

import typing
from pathlib import Path

import toml

if typing.TYPE_CHECKING:
    from .manager import ExtensionManager


class Installed(dict):
    """Installed extensions manager."""

    def __init__(self, manager: ExtensionManager, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.manager = manager
        self.base = manager.base

        self.path = self.base.datadir / "installed.toml"
        Path(self.path).touch(exist_ok=True)

        with open(self.path, "r", encoding="utf-8") as fp:
            self.update(toml.load(fp))

    def dump(self) -> None:
        """Dump the installed extensions database."""
        with open(self.path, "w", encoding="utf-8") as fp:
            toml.dump(dict(self), fp) # couldn't dump it directly 

    def clear_installed(self) -> None:
        """Clear the installed extensions database."""
        self.clear()
        self.dump()
