"""Motion helpers for Vim mode.

Pure functions that compute new cursor positions in Tkinter Text widget
index notation (e.g. '3.7'). All functions accept and return strings
that are valid Tkinter text indices.
"""

from __future__ import annotations

import re
import tkinter as tk
import typing

if typing.TYPE_CHECKING:
    from biscuit.editor.text.text import Text


# ---------------------------------------------------------------------------
# Basic motion
# ---------------------------------------------------------------------------

def move_left(text: "Text") -> str:
    """Move one character left, stopping at line start."""
    idx = text.index(tk.INSERT)
    line, col = map(int, idx.split("."))
    if col > 0:
        return f"{line}.{col - 1}"
    return idx


def move_right(text: "Text") -> str:
    """Move one character right, stopping before the newline."""
    idx = text.index(tk.INSERT)
    line, col = map(int, idx.split("."))
    line_end_col = int(text.index(f"{line}.end").split(".")[1])
    if col < line_end_col:
        return f"{line}.{col + 1}"
    return idx


def move_up(text: "Text") -> str:
    """Move one line up, keeping column if possible."""
    idx = text.index(tk.INSERT)
    line, col = map(int, idx.split("."))
    if line <= 1:
        return f"1.{col}"
    new_line = line - 1
    new_line_len = int(text.index(f"{new_line}.end").split(".")[1])
    return f"{new_line}.{min(col, new_line_len)}"


def move_down(text: "Text") -> str:
    """Move one line down, keeping column if possible."""
    idx = text.index(tk.INSERT)
    line, col = map(int, idx.split("."))
    last_line = int(text.index(tk.END).split(".")[0]) - 1
    if line >= last_line:
        return idx
    new_line = line + 1
    new_line_len = int(text.index(f"{new_line}.end").split(".")[1])
    return f"{new_line}.{min(col, new_line_len)}"


# ---------------------------------------------------------------------------
# Word motions
# ---------------------------------------------------------------------------

_WORD_CHARS = re.compile(r"\w")


def _is_word_char(ch: str) -> bool:
    return bool(_WORD_CHARS.match(ch))


def word_end(text: "Text") -> str:
    """Move to end of next word (like Vim's 'e')."""
    idx = text.index(tk.INSERT)
    line, col = map(int, idx.split("."))
    content = text.get(f"{line}.0", f"{line}.end")
    # skip current word chars, then skip non-word, then find word end
    i = col
    length = len(content)
    # skip whitespace first
    while i < length and not _is_word_char(content[i]):
        i += 1
    # move to end of the word
    while i < length and _is_word_char(content[i]):
        i += 1
    i = max(0, i - 1)
    return f"{line}.{i}"


def word_start_next(text: "Text") -> str:
    """Move to start of next word (like Vim's 'w')."""
    idx = text.index(tk.INSERT)
    line, col = map(int, idx.split("."))
    total_lines = int(text.index(tk.END).split(".")[0]) - 1
    content = text.get(f"{line}.0", f"{line}.end")
    i = col
    length = len(content)
    # skip current word
    while i < length and _is_word_char(content[i]):
        i += 1
    # skip whitespace
    while i < length and not _is_word_char(content[i]):
        i += 1
    if i < length:
        return f"{line}.{i}"
    # wrap to next line
    if line < total_lines:
        next_content = text.get(f"{line + 1}.0", f"{line + 1}.end")
        j = 0
        while j < len(next_content) and not _is_word_char(next_content[j]):
            j += 1
        return f"{line + 1}.{j}"
    return idx


def word_start_prev(text: "Text") -> str:
    """Move to start of previous word (like Vim's 'b')."""
    idx = text.index(tk.INSERT)
    line, col = map(int, idx.split("."))
    content = text.get(f"{line}.0", f"{line}.end")
    i = col - 1
    # skip whitespace backwards
    while i >= 0 and not _is_word_char(content[i]):
        i -= 1
    # skip word chars backwards
    while i > 0 and _is_word_char(content[i - 1]):
        i -= 1
    if i >= 0:
        return f"{line}.{i}"
    if line > 1:
        prev_content = text.get(f"{line - 1}.0", f"{line - 1}.end")
        j = len(prev_content) - 1
        while j > 0 and not _is_word_char(prev_content[j]):
            j -= 1
        while j > 0 and _is_word_char(prev_content[j - 1]):
            j -= 1
        return f"{line - 1}.{j}"
    return idx


# ---------------------------------------------------------------------------
# Word boundary detection (for diw / ciw)
# ---------------------------------------------------------------------------

def get_word_bounds(text: "Text") -> tuple[str, str]:
    """Return (start_index, end_index) of the word under the cursor."""
    idx = text.index(tk.INSERT)
    line, col = map(int, idx.split("."))
    content = text.get(f"{line}.0", f"{line}.end")
    if not content:
        return (idx, idx)

    # Find word boundaries around col
    start = col
    end = col
    while start > 0 and _is_word_char(content[start - 1]):
        start -= 1
    while end < len(content) and _is_word_char(content[end]):
        end += 1
    return (f"{line}.{start}", f"{line}.{end}")


# ---------------------------------------------------------------------------
# Line helpers
# ---------------------------------------------------------------------------

def get_line_start(text: "Text") -> str:
    return text.index("insert linestart")


def get_line_end(text: "Text") -> str:
    return text.index("insert lineend")


def get_first_nonblank(text: "Text") -> str:
    """Return index of first non-blank character in current line (like ^)."""
    line = int(text.index(tk.INSERT).split(".")[0])
    content = text.get(f"{line}.0", f"{line}.end")
    col = 0
    while col < len(content) and content[col] in (" ", "\t"):
        col += 1
    return f"{line}.{col}"
