from __future__ import annotations
from typing import Dict, List, Optional

class GitRemoteManager:
    def __init__(self, repo=None):
        self.repo = repo
        self._remotes: Dict[str, str] = {}

    def add_remote(self, name: str, url: str):
        self._remotes[name] = url
        if self.repo and hasattr(self.repo, "create_remote"):
            self.repo.create_remote(name, url)

    def remove_remote(self, name: str):
        self._remotes.pop(name, None)
        if self.repo and hasattr(self.repo, "delete_remote"):
            self.repo.delete_remote(name)

    def list_remotes(self) -> List[str]:
        return list(self._remotes.keys())

    def fetch_all(self) -> int:
        count = 0
        if self.repo and hasattr(self.repo, "remotes"):
            for r in self.repo.remotes:
                if hasattr(r, "fetch"):
                    r.fetch()
                    count += 1
        return count
