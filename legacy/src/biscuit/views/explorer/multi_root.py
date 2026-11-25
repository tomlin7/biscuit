from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class WorkspaceFolder:
    name: str
    path: str

class MultiRootWorkspaceManager:
    def __init__(self):
        self.folders: List[WorkspaceFolder] = []

    def add_folder(self, name: str, path: str) -> WorkspaceFolder:
        folder = WorkspaceFolder(name, path)
        if folder not in self.folders:
            self.folders.append(folder)
        return folder

    def remove_folder(self, path: str) -> Optional[WorkspaceFolder]:
        for i, f in enumerate(self.folders):
            if f.path == path:
                return self.folders.pop(i)
        return None

    def list_folders(self) -> List[WorkspaceFolder]:
        return list(self.folders)
