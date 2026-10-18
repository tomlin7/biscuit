from __future__ import annotations
import os
from typing import Dict, List, Optional

class FileNestingController:
    def __init__(self, patterns: Dict[str, str] = None):
        self.patterns = patterns or {
            "*.ts": "${capture}.js, ${capture}.d.ts",
            "*.py": "${capture}.pyc",
            "package.json": "package-lock.json",
        }

    def should_nest_under(self, child_file: str, parent_file: str) -> bool:
        child_base = os.path.basename(child_file)
        parent_base = os.path.basename(parent_file)

        if parent_base == "package.json" and child_base == "package-lock.json":
            return True

        if parent_base.endswith(".ts") and (child_base == parent_base[:-3] + ".js" or child_base == parent_base[:-3] + ".d.ts"):
            return True

        if parent_base.endswith(".py") and child_base == parent_base + "c":
            return True

        return False
