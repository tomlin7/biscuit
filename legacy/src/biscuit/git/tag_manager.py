from __future__ import annotations
from typing import List, Optional

class GitTagManager:
    def __init__(self, repo=None):
        self.repo = repo
        self._tags: List[str] = []

    def create_tag(self, tag_name: str, message: str = ""):
        self._tags.append(tag_name)
        if self.repo and hasattr(self.repo, "create_tag"):
            self.repo.create_tag(tag_name, message=message)

    def list_tags(self) -> List[str]:
        if self.repo and hasattr(self.repo, "tags"):
            return [t.name for t in self.repo.tags]
        return list(self._tags)

    def checkout_tag(self, tag_name: str):
        if self.repo and hasattr(self.repo, "git") and hasattr(self.repo.git, "checkout"):
            self.repo.git.checkout(tag_name)
