from __future__ import annotations
from dataclasses import dataclass
from typing import List

@dataclass
class RebaseTodoItem:
    action: str # 'pick', 'squash', 'drop', 'edit'
    commit_hash: str
    message: str

class GitRebaseController:
    def __init__(self):
        self.items: List[RebaseTodoItem] = []

    def set_commits(self, commits: List[RebaseTodoItem]):
        self.items = list(commits)

    def squash(self, index: int):
        if 0 < index < len(self.items):
            self.items[index].action = "squash"

    def drop(self, index: int):
        if 0 <= index < len(self.items):
            self.items[index].action = "drop"

    def reorder(self, from_idx: int, to_idx: int):
        if 0 <= from_idx < len(self.items) and 0 <= to_idx < len(self.items):
            item = self.items.pop(from_idx)
            self.items.insert(to_idx, item)
