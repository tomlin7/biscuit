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
    repo = None

    def __init__(self, repo=None):
        self.repo = repo

    def parse_blame_line(self, blame_entry) -> BlameInfo:
        if isinstance(blame_entry, (list, tuple)) and len(blame_entry) > 0:
            commit = blame_entry[0]
        else:
            commit = getattr(blame_entry, "commit", blame_entry)
        author = str(getattr(commit, "author", "Unknown"))
        summary = str(getattr(commit, "summary", "commit"))
        hexsha = str(getattr(commit, "hexsha", ""))[:7]
        date_str = "recently"
        if hasattr(commit, "authored_datetime"):
            try:
                date_str = commit.authored_datetime.strftime("%Y-%m-%d")
            except Exception:
                pass
        elif hasattr(commit, "date"):
            date_str = str(commit.date)
        return BlameInfo(author=author, date=date_str, commit_hash=hexsha, summary=summary)

    def get_blame(self, file_path: str, line_number: int) -> Optional[BlameInfo]:
        if not self.repo or not file_path:
            return None
        try:
            if callable(getattr(self.repo, "blame", None)):
                blames = self.repo.blame("HEAD", file_path, L=f"{line_number},{line_number}")
                if blames and len(blames) > 0:
                    return self.parse_blame_line(blames[0])
            elif hasattr(self.repo, "git") and callable(getattr(self.repo.git, "blame", None)):
                out = self.repo.git.blame("-L", f"{line_number},{line_number}", "--porcelain", file_path)
                lines = out.splitlines()
                if lines:
                    hash_val = lines[0].split()[0][:7]
                    author = "Unknown"
                    summary = "commit"
                    date_str = "recently"
                    for l in lines[1:]:
                        if l.startswith("author "):
                            author = l[len("author "):]
                        elif l.startswith("summary "):
                            summary = l[len("summary "):]
                        elif l.startswith("author-time "):
                            try:
                                import datetime
                                ts = int(l[len("author-time "):].strip())
                                date_str = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                            except Exception:
                                pass
                    return BlameInfo(author=author, date=date_str, commit_hash=hash_val, summary=summary)
        except Exception:
            return None
        return None
