from __future__ import annotations

import sqlite3


class FixedSizeStack:
    """
    A stack with a fixed size. If the stack is full, the oldest item is removed
    when a new item is added.
    """
    
    def __init__(self, master, name: str, capacity=5):
        self.base = master.base
        self.name = name
        self.capacity = capacity
        self.stack = []
    
    def __iter__(self):
        return iter(self.stack)

    @property
    def list(self):
        return [(i, lambda _, i=i: self.base.open(i)) for i in self.stack[::-1]]

    def push(self, item):
        if len(self.stack) == self.capacity:
            # Remove the item at the bottom (oldest item) if the stack is full
            self.stack.pop(0)
        if item in self.stack:
            # Remove the item if it already exists
            self.stack.remove(item)
        self.stack.append(item)

    def pop(self):
        if not self.is_empty():
            return self.stack.pop()

    def is_empty(self):
        return not len(self.stack)

    def __len__(self):
        return len(self.stack)

    def clear(self):
        self.stack.clear()
    
    def dump_sqlite(self, cursor: sqlite3.Cursor) -> None:
        # print(self.name, self.stack)
        cursor.execute(f"DELETE FROM {self.name};")
        cursor.executemany(
            f"INSERT INTO {self.name} (path) VALUES (?);",
            [(item,) for item in self.stack],
        )
    
    def load_sqlite(self, cursor: sqlite3.Cursor) -> FixedSizeStack:
        cursor.execute(f"SELECT path FROM {self.name};")
        self.stack = [item[0] for item in cursor.fetchall()]
        return self
    