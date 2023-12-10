from dataclasses import dataclass
from typing import List


@dataclass
class Change:
    start: List[int]
    old_end: List[int]
    new_end: List[int]
    old_text: str
    new_text: str

    def update(self, start, old_end, new_end, old_text, new_text):
        self.start = start
        self.old_end = old_end
        self.new_end = new_end
        self.old_text = old_text
        self.new_text = new_text


# @dataclass
# class Changes:
#     change_list: List[Change]
