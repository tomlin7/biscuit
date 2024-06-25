from __future__ import annotations

import os
import typing

if typing.TYPE_CHECKING:
    from biscuit import App

    from .git import Git


class GitIgnore:
    def __init__(self, master):
        self.master: Git = master
        self.base: App = master.base
        self.path = ""
        self.repo = self.master.repo

    def load(self) -> None:
        if not self.base.git_found:
            return

        self.repo = self.master.repo
        self.path = os.path.join(self.base.active_directory, ".gitignore")

    def check(self, path: list[str]) -> list:
        """returns list of ignored files"""

        if not self.base.git_found:
            return []

        return self.repo.ignored(path)

    def add(self, path: str) -> None:
        """Add the given path to the .gitignore file."""

        if not self.base.git_found:
            return

        with open(self.path, "a") as f:
            f.write("\n" + path.replace("\\" "/"))

    def exclude(self, path: str) -> None:
        """Exclude the given path from the .gitignore file."""

        if not self.base.git_found:
            return

        with open(self.path, "a") as f:
            f.write("\n!" + path.replace("\\", "/"))
