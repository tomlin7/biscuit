from __future__ import annotations
import sqlite3
import os
from typing import List, Tuple, Dict

class SemanticCodeIndex:
    def __init__(self, db_path: str = ":memory:"):
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path)
        self._init_db()

    def _init_db(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT,
                start_line INTEGER,
                end_line INTEGER,
                content TEXT
            )
        """)
        self.conn.commit()

    def index_chunk(self, file_path: str, start_line: int, end_line: int, content: str):
        self.conn.execute(
            "INSERT INTO chunks (file_path, start_line, end_line, content) VALUES (?, ?, ?, ?)",
            (file_path, start_line, end_line, content)
        )
        self.conn.commit()

    def search(self, query: str, limit: int = 5) -> List[Tuple[str, int, int, str]]:
        import re
        words = set(re.findall(r"[a-zA-Z0-9]+", query.lower()))
        results = []
        cursor = self.conn.execute("SELECT file_path, start_line, end_line, content FROM chunks")
        for fp, s, e, content in cursor.fetchall():
            c_words = set(re.findall(r"[a-zA-Z0-9]+", content.lower()))
            score = len(words.intersection(c_words))
            if score > 0:
                results.append((score, fp, s, e, content))
        results.sort(key=lambda x: x[0], reverse=True)
        return [(fp, s, e, content) for _, fp, s, e, content in results[:limit]]
