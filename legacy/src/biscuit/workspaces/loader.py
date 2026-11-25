from __future__ import annotations

import typing

import toml

from .workspace import Workspace

if typing.TYPE_CHECKING:
    from .manager import WorkspaceManager


class WorkspaceLoader:
    def __init__(self, manager: WorkspaceManager):
        self.manager = manager
        self.base = manager.base

    def load(self, path):
        with open(path) as f:
            data = toml.load(f)
            self.open_workspace(Workspace(self, path, data["dirs"]))

    def dump_modified(self, path: str, dirs: list[str]):
        with open(path, "w") as f:
            toml.dump({"dirs": dirs}, f)

    def open_workspace(self, workspace: Workspace):
        self.manager.set_workspace(workspace)

    def save(self, active_workspace: Workspace, path: str):
        with open(path, "w") as f:
            toml.dump(active_workspace.export(), f)
