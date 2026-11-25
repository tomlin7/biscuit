"""Vim operator actions (delete, yank, change, paste).

These functions operate on the Tkinter Text widget directly.
They also maintain an internal yank register and mirror it to
the system clipboard for cross-application pasting.
"""

from __future__ import annotations

import tkinter as tk
import typing

from . import motion

if typing.TYPE_CHECKING:
    from biscuit.editor.text.text import Text

# Internal yank register (single unnamed register like Vim's `"`)
_register: str = ""


def get_register() -> str:
    return _register


def set_register(text: "Text", content: str) -> None:
    global _register
    _register = content
    # Mirror to system clipboard
    try:
        text.clipboard_clear()
        text.clipboard_append(content)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Delete operations
# ---------------------------------------------------------------------------

def delete_char(text: "Text") -> None:
    """x — delete character under cursor, yank it."""
    idx = text.index(tk.INSERT)
    char = text.get(idx, f"{idx}+1c")
    if char and char != "\n":
        set_register(text, char)
        text.delete(idx, f"{idx}+1c")


def delete_line(text: "Text") -> None:
    """dd — delete current line, yank it."""
    line = int(text.index(tk.INSERT).split(".")[0])
    total = int(text.index(tk.END).split(".")[0]) - 1

    if total == 1:
        # Only one line: clear it but keep the line
        content = text.get(f"{line}.0", f"{line}.end")
        set_register(text, content + "\n")
        text.delete(f"{line}.0", f"{line}.end")
    else:
        content = text.get(f"{line}.0", f"{line}.end\n")
        if not content.endswith("\n"):
            content += "\n"
        set_register(text, content)
        text.delete(f"{line}.0", f"{line + 1}.0")


def delete_to_word_end(text: "Text") -> None:
    """dw — delete from cursor to end of word."""
    start = text.index(tk.INSERT)
    end = motion.word_end(text)
    if start != end:
        content = text.get(start, f"{end}+1c")
        set_register(text, content)
        text.delete(start, f"{end}+1c")


def delete_inner_word(text: "Text") -> None:
    """diw — delete word under cursor."""
    start, end = motion.get_word_bounds(text)
    content = text.get(start, end)
    set_register(text, content)
    text.delete(start, end)
    text.mark_set(tk.INSERT, start)


def delete_selection(text: "Text") -> None:
    """Delete selected text, yank it."""
    if text.tag_ranges(tk.SEL):
        content = text.get(tk.SEL_FIRST, tk.SEL_LAST)
        set_register(text, content)
        text.delete(tk.SEL_FIRST, tk.SEL_LAST)
        text.tag_remove(tk.SEL, "1.0", tk.END)


def delete_lines_selection(text: "Text") -> None:
    """Delete selected lines (Visual Line mode), yank them."""
    if not text.tag_ranges(tk.SEL):
        return
    sel_start = text.index(tk.SEL_FIRST)
    sel_end = text.index(tk.SEL_LAST)
    start_line = int(sel_start.split(".")[0])
    end_line = int(sel_end.split(".")[0])
    content = text.get(f"{start_line}.0", f"{end_line}.end\n")
    set_register(text, content)
    text.delete(f"{start_line}.0", f"{end_line + 1}.0")
    text.tag_remove(tk.SEL, "1.0", tk.END)


# ---------------------------------------------------------------------------
# Yank operations
# ---------------------------------------------------------------------------

def yank_line(text: "Text") -> None:
    """yy — yank current line."""
    line = int(text.index(tk.INSERT).split(".")[0])
    content = text.get(f"{line}.0", f"{line}.end") + "\n"
    set_register(text, content)


def yank_selection(text: "Text") -> None:
    """Yank selected text."""
    if text.tag_ranges(tk.SEL):
        content = text.get(tk.SEL_FIRST, tk.SEL_LAST)
        set_register(text, content)
        text.tag_remove(tk.SEL, "1.0", tk.END)


def yank_lines_selection(text: "Text") -> None:
    """Yank selected lines (Visual Line mode)."""
    if not text.tag_ranges(tk.SEL):
        return
    sel_start = text.index(tk.SEL_FIRST)
    sel_end = text.index(tk.SEL_LAST)
    start_line = int(sel_start.split(".")[0])
    end_line = int(sel_end.split(".")[0])
    content = text.get(f"{start_line}.0", f"{end_line}.end") + "\n"
    set_register(text, content)
    text.tag_remove(tk.SEL, "1.0", tk.END)


# ---------------------------------------------------------------------------
# Change operations (delete + enter Insert mode)
# ---------------------------------------------------------------------------

def change_to_word_end(text: "Text") -> None:
    """cw — delete from cursor to word end (caller enters Insert mode)."""
    start = text.index(tk.INSERT)
    end = motion.word_end(text)
    if start != end:
        content = text.get(start, f"{end}+1c")
        set_register(text, content)
        text.delete(start, f"{end}+1c")


def change_inner_word(text: "Text") -> None:
    """ciw — delete inner word (caller enters Insert mode)."""
    start, end = motion.get_word_bounds(text)
    content = text.get(start, end)
    set_register(text, content)
    text.delete(start, end)
    text.mark_set(tk.INSERT, start)


# ---------------------------------------------------------------------------
# Paste
# ---------------------------------------------------------------------------

def paste_after(text: "Text") -> None:
    """p — paste after cursor (line-wise: below, char-wise: after)."""
    content = _register
    if not content:
        return
    if content.endswith("\n"):
        # Line-wise paste: insert below current line
        line = int(text.index(tk.INSERT).split(".")[0])
        text.insert(f"{line}.end", "\n" + content.rstrip("\n"))
        text.mark_set(tk.INSERT, f"{line + 1}.0")
    else:
        # Character-wise paste: insert after cursor
        idx = text.index(tk.INSERT)
        text.insert(f"{idx}+1c", content)
        text.mark_set(tk.INSERT, f"{idx}+{len(content)}c")


def paste_before(text: "Text") -> None:
    """P — paste before cursor."""
    content = _register
    if not content:
        return
    if content.endswith("\n"):
        line = int(text.index(tk.INSERT).split(".")[0])
        text.insert(f"{line}.0", content)
        text.mark_set(tk.INSERT, f"{line}.0")
    else:
        idx = text.index(tk.INSERT)
        text.insert(idx, content)
