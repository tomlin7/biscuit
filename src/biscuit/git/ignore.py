from __future__ import annotations

import os
import typing

from gitignore_parser import parse_gitignore

if typing.TYPE_CHECKING:
    from src.biscuit import App

    from .git import Git


class GitIgnore:
    def __init__(self, master):
        self.master: Git = master
        self.base: App = master.base
        self.match = None
        self.path = ""

    def load(self):
        """Load the .gitignore file."""

        if not self.base.git_found:
            return

        self.path = os.path.join(self.base.active_directory, ".gitignore")
        if os.path.exists(self.path):
            self.match = parse_gitignore(self.path)
        else:
            self.match = None

    def __contains__(self, path: str) -> bool:
        """Check if the given path is ignored by the .gitignore file."""

        if not self.match:
            return False

        return self.match(path)
