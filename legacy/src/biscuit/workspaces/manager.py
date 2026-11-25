from __future__ import annotations

import typing

from .loader import WorkspaceLoader
from .workspace import Workspace

if typing.TYPE_CHECKING:
    from biscuit.app import App


class WorkspaceManager:
    def __init__(self, base: App):
        self.base = base
        self.workspace = None

        self.loader = WorkspaceLoader(self)

    def set_workspace(self, workspace: Workspace):
        self.workspace = workspace
        self.base.workspace_opened()

    def add_dir(self, dir: str):
        if not self.workspace:
            self.set_workspace(Workspace(self, "workspace.toml", [dir]))
            self.set_workspace(Workspace(self, "workspace.toml", [dir]))
            return

        self.workspace.add_dir(dir)
        self.base.workspace_changed(dir)

    def load(self, path: str):
        self.loader.load(path)

    def save(self, path: str):
        self.loader.save(path)

    def close(self):
        self.workspace = None
        self.base.workspace_closed()
