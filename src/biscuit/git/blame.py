from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

@dataclass
class BlameInfo:
    author: str
    date: str
    commit_hash: str
    summary: str

    def format_annotation(self) -> str:
        return f"{self.author}, {self.date} • {self.summary}"

class GitBlameController:
    def __init__(self, repo=None):
        self.repo = repo

    def parse_blame_line(self, blame_entry) -> BlameInfo:
        commit = getattr(blame_entry, "commit", blame_entry)
        author = str(getattr(commit, "author", "Unknown"))
        summary = str(getattr(commit, "summary", "commit"))
        hexsha = str(getattr(commit, "hexsha", ""))[:7]
        return BlameInfo(author=author, date="recently", commit_hash=hexsha, summary=summary)
