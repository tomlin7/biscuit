import difflib
from typing import Iterator


class Differ(difflib.Differ):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.master = master
        self.base = master.base

    def get_diff(self, lhs, rhs) -> Iterator[str]:
        return self.compare(lhs, rhs)
