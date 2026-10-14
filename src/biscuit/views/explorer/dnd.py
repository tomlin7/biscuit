from __future__ import annotations
import os
import shutil
from typing import Optional

class FileDragDropController:
    def __init__(self):
        self.dragged_path: Optional[str] = None

    def start_drag(self, source_path: str):
        self.dragged_path = source_path

    def drop_on(self, target_directory: str, copy: bool = False) -> str:
        if not self.dragged_path or not os.path.exists(self.dragged_path):
            raise FileNotFoundError("Source path does not exist")
        dest = os.path.join(target_directory, os.path.basename(self.dragged_path))
        if copy:
            if os.path.isdir(self.dragged_path):
                shutil.copytree(self.dragged_path, dest)
            else:
                shutil.copy2(self.dragged_path, dest)
        else:
            shutil.move(self.dragged_path, dest)
        self.dragged_path = None
        return dest
