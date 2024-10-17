from __future__ import annotations

import typing
from typing import List

if typing.TYPE_CHECKING:
    from .loader import WorkspaceLoader


class Workspace:
    def __init__(self, loader: WorkspaceLoader, path: str, dirs: List[str]):
        self.loader = loader
        self.path = path
        self.dirs = dirs

    def add_dir(self, dir: str):
        self.dirs.append(dir)
        self.loader.dump_modified(self.path, self.dirs)

    def export(self):
        return {"dirs": self.dirs}
