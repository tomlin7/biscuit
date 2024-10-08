from __future__ import annotations

import os
import queue
import re
import threading
import tkinter as tk
import typing
from collections import deque
from tkinter.messagebox import askokcancel

import chardet
import tarts as lsp

from biscuit.common.minclosestdict import MinClosestKeyDict
from biscuit.common.textindex import TextIndex
from biscuit.language.data import Diagnostic

if typing.TYPE_CHECKING:
    from biscuit.language.data import (
        WorkspaceEdits,
        HoverResponse,
        Jump,
        Completions,
        Diagnostic,
    )
    from . import TextEditor

from biscuit.common import textutils
from biscuit.common.ui import Text as BaseText

from ..comment_prefix import get_comment_prefix
from .highlighter import Highlighter

BRACKET_MAP = {"(": ")", "{": "}", "[": "]"}
BRACKET_MAP_REV = {v: k for k, v in BRACKET_MAP.items()}
OPENING_BRACKETS = ("(", "{", "[")
CLOSING_BRACKETS = (")", "}", "]")


class Text(BaseText):
    """Improved Text widget"""

    def __init__(
        self,
        master: TextEditor,
        path: str = None,
        exists: bool = True,
        minimalist: bool = False,
        standalone: bool = False,
        language: str = None,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.master: TextEditor = master
        self.path = path
        self.filename = os.path.basename(path) if path else None
        self.encoding = "utf-8"
        self.eol = "CRLF"
        self.exists = exists
        self.minimalist = minimalist
        self.standalone = standalone
        self.language = language
        self.language_alias = ""
        self.unsupported = False

        self.ctrl_down = False
        self.buffer_size = 4096
        self.bom = True
        self.current_word = None
        self.words: list[str] = []
        self.lsp: bool = False
        self.current_indent_level = 0

        self.hover_after = None
        self.last_hovered = None

        # self.last_change = Change(None, None, None, None, None)
        self.highlighter = Highlighter(self, language)
        if not self.standalone and not self.minimalist:
            self.base.statusbar.on_open_file(self)
            self.autocomplete = self.base.autocomplete
            self.definitions = self.base.peek
            self.hover = self.base.hover

        self.diagnostics = MinClosestKeyDict()

        self.focus_set()
        self.config_tags()
        self.create_proxy()
        self.config_bindings()
        self.update_idletasks()
        self.comment_prefix = get_comment_prefix(self.language.lower())
        tab_width = self.base.settings.font.measure(" " * self.base.tab_spaces)
        self.configure(
            tabs=(tab_width,),
            blockcursor=self.base.block_cursor,
            wrap=tk.NONE,
            relief=tk.FLAT,
            highlightthickness=0,
            bd=0,
            **self.base.theme.editors.text,
        )

        # modified event
        self.clear_modified_flag()
        self._user_edit = True
        self._edit_stack = []
        self._edit_stack_index = -1

    def config_tags(self):
        self.indentguide_stipple = self.base.resources.indent_guide

        self.tag_config(tk.SEL, background=self.base.theme.editors.selection)
        self.tag_config(
            "hyperlink",
            foreground=self.base.theme.editors.hyperlink,
            underline=True,
        )

        self.tag_config("hint", underline=True, underlinefg="gray")
        self.tag_config("information", underline=True)
        self.tag_config("warning", underline=True, underlinefg="yellow")
        self.tag_config("error", underline=True, underlinefg="red")

        self.tag_config("found", background=self.base.theme.editors.found)
        self.tag_config("foundcurrent", background=self.base.theme.editors.foundcurrent)
        self.tag_config("currentword", background=self.base.theme.editors.currentword)
        self.tag_config(
            "currentline",
            background=self.base.theme.editors.currentline,
        )
        self.tag_config("hover", background=self.base.theme.editors.hovertag)

        self.tag_configure(
            "indent_guide",
            bgstipple=f"@{self.indentguide_stipple}",
            background=self.base.theme.border,
        )
        self.tag_configure(
            "current_indent_guide",
            bgstipple=f"@{self.indentguide_stipple}",
            background=self.base.theme.secondary_foreground,
        )

        self.tag_raise(tk.SEL, "hover")
        self.tag_raise(tk.SEL, "currentline")
        self.tag_raise(tk.SEL, "currentword")
        self.tag_raise("currentword", "currentline")

        self.tag_config(
            "activebracket", background=self.base.theme.editors.activebracket
        )
        self.tag_config("red", foreground="red")
        for i in self.base.theme.editors.bracket_colors:
            self.tag_config(i, foreground=f"#{i}")

    def config_bindings(self):
        self.bind("<KeyRelease>", self.key_release_events)

        self.bind("<Control-f>", self.open_find_replace)
        self.bind("<Control-g>", lambda _: self.base.palette.show(":"))
        self.bind("<Control-Left>", lambda _: self.handle_ctrl_hmovement())
        self.bind("<Control-Right>", lambda _: self.handle_ctrl_hmovement(True))
        self.bind("<Control-Shift-Left>", lambda _: self.handle_ctrl_shift_hmovement())
        self.bind(
            "<Control-Shift-Right>", lambda _: self.handle_ctrl_shift_hmovement(True)
        )

        self.bind("<Shift-Alt-Up>", self.event_copy_line_up)
        self.bind("<Shift-Alt-Down>", self.event_copy_line_down)
        self.bind("<Alt-Up>", self.event_move_line_up)
        self.bind("<Alt-Down>", self.event_move_line_down)

        self.bind("<Return>", self.enter_key_events)
        self.bind("<Tab>", self.tab_key_events)
        self.bind("<Shift-Tab>", self.dedent_selection)

        # undo-redo
        self.bind_all("<<Modified>>", self._been_modified)

        # pair completion
        self.bind("<parenleft>", self.open_bracket)
        self.bind("<braceleft>", self.open_bracket)
        self.bind("<bracketleft>", self.open_bracket)

        self.bind("<parenright>", self.close_bracket)
        self.bind("<braceright>", self.close_bracket)
        self.bind("<bracketright>", self.close_bracket)

        self.bind("<apostrophe>", self.complete_pair)
        self.bind("<quotedbl>", self.complete_pair)
        self.bind("<BackSpace>", self.remove_pair)

        if self.minimalist or self.standalone:
            return

        self.bind("<Control-slash>", self.toggle_comment)

        # autocomplete
        self.bind("<FocusOut>", self.event_focus_out)
        self.bind("<Button-1>", self.event_mouse_down)
        self.bind("<Button-3>", self.base.text_editor_context_menu.show)
        self.bind("<Leave>", self.event_leave)
        self.bind("<Up>", self.autocomplete.move_up)
        self.bind("<Down>", self.autocomplete.move_down)

        # lspc
        self.bind("<Map>", self.event_mapped)
        self.bind("<F2>", self.request_rename)
        self.bind("<Unmap>", self.event_unmapped)
        self.bind("<Destroy>", self.event_destroy)
        self.bind("<Motion>", self.request_hover)
        self.bind("<<Selection>>", self.on_selection)
        self.bind("<Control-KeyPress>", lambda _: self.set_ctrl_key(True))
        self.bind("<Control-KeyRelease>", lambda _: self.set_ctrl_key(False))
        self.bind("<Control-Button-1>", self.request_references)
        self.bind("<Control-comma>", self.request_definition)
        self.bind(
            "<Control-period>",
            lambda _: self.base.language_server_manager.request_completions(self),
        )

        self.tag_bind("error", "<Enter>", lambda _: self.diagnostic_hover(1))
        self.tag_bind("warning", "<Enter>", lambda _: self.diagnostic_hover(2))
        self.tag_bind("information", "<Enter>", lambda _: self.diagnostic_hover(3))
        self.tag_bind("hint", "<Enter>", lambda _: self.diagnostic_hover(4))

        self.tag_bind("error", "<Leave>", self.base.diagnostic.hide)
        self.tag_bind("warning", "<Leave>", self.base.diagnostic.hide)
        self.tag_bind("information", "<Leave>", self.base.diagnostic.hide)
        self.tag_bind("hint", "<Leave>", self.base.diagnostic.hide)

    def key_release_events(self, event: tk.Event):
        self._user_edit = True

        match event.keysym.lower():
            case (
                "button-2"
                | "backspace"
                | "escape"
                | "control_l"
                | "control_r"
                | "space"
                | "return"
                | "tab"
            ):
                self.hide_autocomplete()
            case "right" | "left":
                if self.autocomplete.active:
                    self.update_completions()

            case (
                "up"
                | "down"
                | "shift_l"
                | "shift_r"
                | "alt_l"
                | "alt_r"
                | "meta_l"
                | "meta_r"
                | "shift"
                | "alt"
                | "meta"
            ):
                pass
            case "braceleft" | "bracketleft" | "parenleft" | "apostrophe" | "quotedbl":
                pass

            # auto space after : and ,
            case ":" | ",":
                self.insert(tk.INSERT, " ")
            case _:
                if self.lsp:
                    self.request_autocomplete(event)
                else:
                    self.show_autocomplete(event)

        self.update_words_list()

    def diagnostic_hover(self, severity: int) -> str:
        if pos := self.get_mouse_pos():
            message, start = self.diagnostics[pos]
            self.base.diagnostic.show(self, start, message, severity)

    def update_indent_guides(self) -> None:
        if self.minimalist:
            return

        self.tag_remove("indent_guide", "1.0", "end")
        self.tag_remove("current_indent_guide", "1.0", "end")
        lines = self.get("1.0", "end-1c").split("\n")

        self.current_indent_level = self.get_current_indent_level() - 1

        for line_number, line in enumerate(lines, start=1):
            indent_level = self.calculate_indent_level(line)
            if indent_level > 0:
                self.add_indent_guide(line_number, indent_level)

    def calculate_indent_level(self, line: str) -> int:
        indent = len(line) - len(line.lstrip())
        return indent // self.base.tab_spaces

    def add_indent_guide(self, line_number: int, indent_level: int) -> None:
        for level in range(indent_level):
            start_index = f"{line_number}.{level * self.base.tab_spaces - 1}"
            end_index = f"{line_number}.{level * self.base.tab_spaces + 1}"
            self.tag_add(
                (
                    "current_indent_guide"
                    if level == self.current_indent_level
                    else "indent_guide"
                ),
                start_index,
                end_index,
            )

    def get_current_indent_level(self) -> int:
        prev = self.get("insert-1l linestart", "insert-1l lineend")
        line = self.get("insert linestart", "insert lineend")
        next_line = self.get("insert+1l linestart", "insert+1l lineend")

        return max(
            self.calculate_indent_level(prev),
            self.calculate_indent_level(line),
            self.calculate_indent_level(next_line),
        )

    # TODO this wont work properly
    # write a custom ast, parser for bracket matching
    def highlight_current_brackets(self):
        self.tag_remove("activebracket", "1.0", tk.END)
        i = self.index(tk.INSERT)
        start, end = None, None

        try:
            if start := self.search(
                r"[\{\[\(\)\]\}]", i, i + " linestart", backwards=True, regexp=True
            ):
                if counter := BRACKET_MAP.get(self.get(start, start + "+1c")):
                    end = self.search(counter, i, stopindex=i + " lineend")
        except tk.TclError:
            pass

        if not end:
            return

        self.tag_add("activebracket", start, start + "+1c")
        self.tag_add("activebracket", end, end + "+1c")

    def refresh_wrap(self):
        self.config(wrap=tk.WORD if self.base.wrap_words else tk.NONE)

    def open_bracket(self, e: tk.Event):
        text = self.get("1.0", "insert")
        i = 0
        for ch in text:
            if ch in OPENING_BRACKETS:
                i += 1
            elif ch in CLOSING_BRACKETS:
                if i > 0:
                    i -= 1
        self.complete_pair(e, self.base.theme.editors.bracket_colors[(i % 3)])

        return "break"

    def close_bracket(self, e: tk.Event):
        text = self.get("1.0", "insert")
        i = -1
        stack = []
        for ch in text:
            if ch in OPENING_BRACKETS:
                i += 1
                stack.append(BRACKET_MAP[ch])
            elif ch in CLOSING_BRACKETS:
                if i > -1:
                    i -= 1
                    if stack[-1] == ch:
                        stack.pop()
        if stack and stack[-1] == e.char:
            # skip if next character is what we are closing
            if c := self.get("insert", "insert+1c"):
                if c == e.char:
                    self.mark_set(tk.INSERT, "insert+1c")
                    return "break"

        # TODO; coloring not done right. whatever color the last bracket has that color is spread to the next characters
        #     self.insert(tk.INSERT, stack.pop(), self.base.theme.editors.bracket_colors[(i%3)] if i > -1 else 'red')
        # else:
        self.insert(tk.INSERT, e.char, "red")
        return "break"

    def complete_pair(self, e: tk.Event, tag=None):
        end = {"(": ")", "{": "}", "[": "]", '"': '"', "'": "'"}.get(e.char)
        char = e.char
        # if there is selection, surround the selection with character
        if self.tag_ranges(tk.SEL):
            if tag:
                self.insert(tk.SEL_LAST, end, tag)
                self.insert(tk.SEL_FIRST, char, tag)
            else:
                self.insert(tk.SEL_LAST, end)
                self.insert(tk.SEL_FIRST, char)
            return "break"

        if char in ('"', "'") and self.get("insert-1c", "insert").strip():
            return

        # if there is no selection, insert the character and move cursor inside the pair
        # TODO; coloring is not done properly
        # if tag:
        #     self.insert(tk.INSERT, char + end, tag)
        # else:
        self.insert(tk.INSERT, char + end)
        self.mark_set(tk.INSERT, "insert-1c")
        return "break"

    def remove_pair(self, _: tk.Event):
        if self.tag_ranges(tk.SEL):
            self.delete(tk.SEL_FIRST, tk.SEL_LAST)
            return "break"

        if not self.get("insert-1c", "insert+1c") in ["()", "[]", "{}", '""', "''"]:
            return

        self.delete("insert-1c", "insert+1c")
        return "break"

    def hide_autocomplete(self, *_):
        if self.minimalist:
            return

        self.autocomplete.hide()

    def show_autocomplete(self, event: tk.Event):
        if self.minimalist or not self.current_word or event.keysym in ["Down", "Up"]:
            return
        if not self.current_word.strip().isalpha() or self.current_word.strip() != ".":
            self.hide_autocomplete()

        self.autocomplete.show(self)
        self.update_completions()

    def update_words_list(self, *_):
        if self.minimalist or self.lsp:
            return

        try:
            content = (
                self.get(1.0, "insert-1c wordstart-1c")
                + " "
                + self.get("insert+1c", tk.END)
            )
            self.words = list(set(re.findall(r"\w+", content)))
        except:
            pass

    def update_completions(self):
        """Helper function for `AutoComplete` popup.

        If LSP is enabled, then request completions from the language server.
        Otherwise, update the completions list with words in editor."""

        if self.minimalist:
            return

        if self.lsp:
            self.request_autocomplete(self)
        else:
            self.autocomplete.update_completions(self)

    def replace_current_word(self, new_word: str):
        """Helper function for `AutoComplete` popup.
        Replaces the current word with the chosen word."""

        if self.current_word.startswith("\n"):
            self.delete("insert-1c wordstart+1c", "insert")
        else:
            self.delete("insert-1c wordstart", "insert")
        self.insert("insert", new_word)

    def cursor_screen_location(self):
        """Helper function for `AutoComplete` popup positioning.
        Returns the screen location of the cursor."""

        pos_x, pos_y = self.winfo_rootx(), self.winfo_rooty()

        cursor = tk.INSERT
        bbox = self.bbox(cursor)
        if not bbox:
            return (0, 0)

        bbx_x, bbx_y, _, bbx_h = bbox
        return (pos_x + bbx_x - 1, pos_y + bbx_y + bbx_h)

    def cursor_wordstart_screen_location(self):
        """Helper function for `Rename` popup positioning.
        Returns the screen location of the word start at the cursor position."""

        pos_x, pos_y = self.winfo_rootx(), self.winfo_rooty()

        cursor = tk.INSERT + " wordstart"
        bbox = self.bbox(cursor)
        if not bbox:
            return (0, 0)

        bbx_x, bbx_y, _, bbx_h = bbox
        return (pos_x + bbx_x - 1, pos_y + bbx_y + bbx_h)

    def enter_key_events(self, *_):
        """Handles enter key press event.
        - If the autocomplete is active, then choose the selected item.
        - Otherwise check the indentation and insert a newline with proper indentation.
        """

        if not self.minimalist and self.autocomplete.active:
            self.autocomplete.choose(self)
            return "break"

        return self.check_indentation()

    def tab_key_events(self, *_):
        """Handles tab key press event.
        - If the autocomplete is active, then choose the selected item.
        - If there is a selection, then indent the selected text."""

        if not self.minimalist and self.autocomplete.active:
            self.autocomplete.choose(self)
            return "break"

        if self.tag_ranges(tk.SEL):
            return self.indent_selection()

    def comment_selection(self):
        """Helper function of toggle_comment().
        Comments selected lines with the comment prefix of the language"""

        sel_first = self.index(tk.SEL_FIRST)
        sel_last = self.index(tk.SEL_LAST)
        start_line = int(float(sel_first))
        end_line = int(float(sel_last))

        for line in range(start_line, end_line + 1):
            # skip empty lines, they won't be commented
            if not self.get(f"{line}.0", f"{line}.0 lineend").strip():
                continue

            self.insert(f"{line}.0", f"{self.comment_prefix} ")

        self.tag_remove(tk.SEL, "1.0", tk.END)
        self.tag_add(tk.SEL, sel_first, sel_last)
        return "break"

    def uncomment_selection(self):
        """Helper function of toggle_comment().
        Uncomments selected lines with the comment prefix of the language"""

        sel_first = self.index(tk.SEL_FIRST)
        sel_last = self.index(tk.SEL_LAST)
        start_line = int(float(sel_first))
        end_line = int(float(sel_last))

        for line in range(start_line, end_line + 1):
            # delete comment prefix with the trailing space
            if (
                self.get(f"{line}.0", f"{line}.{len(self.comment_prefix)+1}")
                == f"{self.comment_prefix} "
            ):
                self.delete(f"{line}.0", f"{line}.{len(self.comment_prefix)+1}")
            # trailing space not detected, delete the comment prefix
            elif (
                self.get(f"{line}.0", f"{line}.{len(self.comment_prefix)}")
                == f"{self.comment_prefix}"
            ):
                self.delete(f"{line}.0", f"{line}.{len(self.comment_prefix)}")

        self.tag_remove(tk.SEL, "1.0", tk.END)
        self.tag_add(tk.SEL, sel_first, sel_last)
        return "break"

    def toggle_comment(self, *_):
        """Toggles comments on selected lines with the comment prefix of the language"""

        if not (self.comment_prefix and self.tag_ranges(tk.SEL)):
            return "break"

        sel_first = f"{self.index(tk.SEL_FIRST)} linestart"
        sel_last = f"{self.index(tk.SEL_LAST)} lineend"

        # if all the selected *non-empty* lines start with comment prefix, then proceed to uncomment
        if all(
            (
                i.startswith(self.comment_prefix)
                for i in self.get(sel_first, sel_last).split("\n")
                if i.strip()
            )
        ):
            return self.uncomment_selection()

        # otherwise comment the selected lines
        return self.comment_selection()

    def dedent_selection(self, _):
        """Dedent the selected text by removing tabs or spaces at the start of each line"""

        sel_first = self.index(tk.SEL_FIRST)
        sel_last = self.index(tk.SEL_LAST)
        start_line = int(float(sel_first))
        end_line = int(float(sel_last))

        for line in range(start_line, end_line + 1):
            if (
                self.get(f"{line}.0", f"{line}.1") == "\t"
                or self.get(f"{line}.0", f"{line}.{self.base.tab_spaces}")
                == " " * self.base.tab_spaces
            ):
                self.delete(f"{line}.0", f"{line}.1")

        self.tag_remove(tk.SEL, "1.0", tk.END)
        self.tag_add(tk.SEL, sel_first, sel_last)
        return "break"

    def indent_selection(self):
        """Indent the selected text by adding tabs at the start of each line"""

        sel_first = self.index(tk.SEL_FIRST)
        sel_last = self.index(tk.SEL_LAST)
        start_line = int(float(sel_first))
        end_line = int(float(sel_last))

        for line in range(start_line, end_line + 1):
            self.insert(f"{line}.0", "\t")

        self.tag_remove(tk.SEL, "1.0", tk.END)
        self.tag_add(tk.SEL, sel_first, sel_last)
        return "break"

    def refresh(self):
        self.highlighter.highlight()
        self.highlight_current_word()

        if self.minimalist or self.standalone:
            return

        self.current_word = self.get("insert-1c wordstart", "insert")
        self.base.language_server_manager.request_outline(self)
        self.highlight_current_line()
        self.highlight_current_brackets()
        self.update_indent_guides()

        # TODO send only portions of text on change to the LSPServer
        # current solution is not scalable, and will cause lag on large files

        # commenting this out for now, as the way of handling changes is not properly done
        # the changes shall be recorded before they are actually made, but we can't do that from here
        # this requires writing a custom change handler for text widget
        # eg. in the 'delete' command below, i can get indices like ('sel.start', 'sel.end') but not actual indices
        # these are useless as if we try to index() these indices we will get indices from the modified content,
        # not the old one. and since the modified content no longer have sel, this will throw an error

        # if args[0] == tk.INSERT:
        #     start_index = self.get_cursor_pos()

        #     end_index = self.index(tk.INSERT + f"+{len(args[2])}c")
        #     self.last_change.update(
        #         start=[int(i) for i in start_index.split('.')],
        #         old_end=[int(i) for i in start_index.split('.')],
        #         new_end=[int(i) for i in end_index.split('.')],
        #         old_text='',
        #         new_text=args[2]
        #     )

        # elif args[0] == 'delete':
        #     start_index = self.get_cursor_pos()
        #     if len(args) == 2:
        #         # is one char deleted
        #         # ('delete', 'insert-1c')
        #         start_index = self.index(tk.INSERT + f"-1c")
        #         end_index = self.get_cursor_pos()
        #         print(start_index, self.get(start_index, end_index), "------------------------------")
        #     else:
        #         # there must be selection then
        #         # ('delete', 'sel.first', 'sel.last')
        #         start_index = self.index(tk.SEL_FIRST)
        #         end_index = self.index(tk.SEL_LAST)
        #         print(start_index, self.get(start_index, end_index), "------------------------------")

        #     self.last_change.update(
        #         start=[int(i) for i in start_index.split('.')],
        #         old_end=[int(i) for i in start_index.split('.')],
        #         new_end=[int(i) for i in end_index.split('.')],
        #         old_text='',
        #         new_text=''
        #     )
        # elif args[0] == 'replace':
        #     start_index = self.get_cursor_pos()
        #     end_index = self.index(tk.INSERT + f"+{len(args[3])}c")
        #     self.last_change.update(
        #         start=[int(i) for i in start_index.split('.')],
        #         old_end=[int(i) for i in start_index.split('.')],
        #         new_end=[int(i) for i in end_index.split('.')],
        #         old_text=args[3],
        #         new_text=args[2]
        #     )
        # else:
        #     return
        # self.base.languageservermanager.content_changed(self)

    def is_identifier(self, text: str) -> str:
        return bool(re.match("^[a-zA-Z_][a-zA-Z0-9_]*$", text))

    def set_ctrl_key(self, flag):
        self.ctrl_down = flag

    def clear_goto_marks(self):
        self.tag_remove("hyperlink", 1.0, tk.END)

    def request_definition(self, from_menu=False, *_):
        if not from_menu and (not self.lsp or not self.last_hovered):
            return

        self.base.language_server_manager.request_goto_definition(self)

    def request_references(self, from_menu=False, *_):
        if not from_menu and (not self.lsp or not self.last_hovered):
            return

        self.base.language_server_manager.request_references(self)
        return "break"

    def request_hover(self, _):
        if not self.lsp or self.tag_ranges(tk.SEL):
            return

        index = self.index(tk.CURRENT)
        start, end = index + " wordstart", index + " wordend"
        word = self.get(start, end)
        if word.startswith("\n"):
            start = index + " linestart"
        word = word.strip()

        self.clear_goto_marks()

        if any(token.startswith("Token.Keyword") for token in self.tag_names(start)):
            return

        if word and self.is_identifier(word):
            if self.ctrl_down:
                self.tag_add("hyperlink", start, end)
        else:
            # TODO hide with a delay, cancel hiding if mouse is on top of hover popup
            self.hover.hide()
            self.tag_remove("hover", 1.0, tk.END)
            self.last_hovered = None
            return

        if self.last_hovered == word:
            return

        self.last_hovered = word
        self.tag_remove("hover", 1.0, tk.END)
        self.tag_add("hover", start, end)

        # TODO delayed hovers
        # if self.hover_after:
        #     self.after_cancel(self.hover_after)

        # self.after(500, ...)

        self.base.language_server_manager.request_hover(self)

    def request_autocomplete(self, _):
        if self.minimalist or not self.lsp:
            return

        if self.is_identifier(self.current_word) or self.current_word.strip() == ".":
            return self.base.language_server_manager.request_completions(self)

        self.hide_autocomplete()

    def request_rename(self, *_):
        self.base.rename.show(self)

    def lsp_show_autocomplete(self, response: Completions) -> None:
        self.autocomplete.lsp_update_completions(self, response.completions)

    def lsp_diagnostics(self, response: list[Diagnostic]) -> None:
        self.tag_remove("error", 1.0, tk.END)
        self.tag_remove("warning", 1.0, tk.END)
        self.tag_remove("information", 1.0, tk.END)
        self.tag_remove("hint", 1.0, tk.END)

        self.diagnostics.clear()

        for i in response:
            self.diagnostics[i.start] = i.message

            match i.severity:
                case 1:
                    self.tag_add("error", i.start, i.end)
                case 2:
                    self.tag_add("warning", i.start, i.end)
                case 4:
                    self.tag_add("hint", i.start, i.end)
                case _:
                    self.tag_add("information", i.start, i.end)

    def lsp_goto_definition(self, response: Jump) -> None:
        if not response.locations:
            return

        if len(response.locations) == 1:
            return self.base.goto_location(
                response.locations[0].file_path, response.locations[0].start
            )

        self.definitions.show(self, response)

    def lsp_hover(self, response: HoverResponse) -> None:
        if not (response.text or response.docs):
            return self.hover.hide()

        try:
            self.hover.show(self, response)
        except Exception as e:
            print(e)

    def lsp_rename(self, changes: WorkspaceEdits):
        for i in changes.edits:
            try:
                self.base.open_workspace_edit(i.file_path, i.edits)
            except:
                # this indeed is a darn task to do so not surprised
                pass

    def set_tab_size(self, size: int) -> None:
        if not size:
            return

        tab_width = self.base.settings.font.measure(" " * size)
        self.configure(tabs=(tab_width,))

    def set_block_cursor(self, flag: bool) -> None:
        self.configure(blockcursor=flag)

    def get_cursor_pos(self):
        return self.index(tk.INSERT)

    def get_mouse_pos(self):
        return self.index(tk.CURRENT)

    def get_current_word(self) -> str:
        """Returns current word cut till the cursor"""

        return self.current_word.strip()

    def get_current_fullword(self) -> str | None:
        """Returns current word uncut and fully"""

        index = self.index(tk.INSERT)
        start, end = index + " wordstart", index + " wordend"
        word = self.get(start, end).strip()
        return word if self.is_identifier(word) else None

    def handle_ctrl_hmovement(self, delta=False):
        if delta:
            self.move_to_next_word()
        else:
            self.move_to_previous_word()

        return "break"

    def handle_ctrl_shift_hmovement(self, delta=False):
        if delta:
            self.select_to_next_word()
        else:
            self.select_to_previous_word()

        return "break"

    def select_to_next_word(self):
        self.tag_add(tk.SEL, "insert wordstart", "insert+1c wordend")
        self.mark_set(tk.INSERT, "insert+1c wordend")

    def select_to_previous_word(self):
        self.tag_add(tk.SEL, "insert-1c wordstart", "insert wordend")
        self.mark_set(tk.INSERT, "insert-1c wordstart")

    def move_to_next_word(self):
        self.mark_set(tk.INSERT, self.index("insert+1c wordend"))

    def move_to_previous_word(self):
        self.mark_set(tk.INSERT, self.index("insert-1c wordstart"))

    def on_selection(self, *args):
        self.tag_remove("hover", 1.0, tk.END)

    def update_current_indent(self):
        line = self.get("insert linestart", "insert lineend")
        match = re.match(r"^(\s+)", line)
        self.current_indent = len(match.group(0)) if match else 0

    def update_current_line(self):
        self.current_line = self.get("insert linestart", "insert lineend")
        return self.current_line

    def add_newline(self, count=1):
        self.insert(tk.INSERT, "\n" * count)

    def check_indentation(self, *args):
        self.update_current_indent()
        if self.update_current_line():
            if self.current_line[-1] in ["{", "[", ":", "("]:
                self.current_indent += self.base.tab_spaces
            elif self.current_line[-1] in ["}", "]", ")"]:
                self.current_indent -= self.base.tab_spaces

            self.add_newline()
            self.insert(tk.INSERT, " " * self.current_indent)

            self.update_current_indent()

            return "break"

    def multi_selection(self, *args):
        # TODO: multi cursor editing
        return "break"

    def open_find_replace(self, *_):
        self.base.findreplace.show(self)

    def detect_encoding(self, file_path):
        if not self.exists:
            return "utf-8"

        try:
            with open(file_path, "rb") as file:
                bomstring = file.read(8)
                detected = chardet.detect(bomstring)
                encoding = detected["encoding"].lower()
                if encoding == "ascii":
                    return "utf-8"

                return encoding
        except Exception as e:
            # empty file
            return "utf-8"

    def change_eol(self, eol: str):
        if not self.exists:
            text = self.get_all_text()
            if not text.strip():
                self.eol = eol
                self.base.statusbar.on_open_file(self)
                return
        self.encoding = self.encoding or self.detect_encoding(self.path)
        if self.path and self.exists:
            self.clear()
            file = open(
                self.path, "r", encoding=self.encoding, buffering=self.buffer_size
            )
            self.queue = queue.Queue()
            threading.Thread(target=self.read_file, args=(file,)).start()
            self.process_queue(eol=eol)
        else:
            self.load_text(text, eol=eol)
        self.eol = eol
        self.base.statusbar.on_open_file(self)

    def reopen(self, encoding=None, eol=None) -> None:
        if not self.path or not self.exists:
            return

        self.clear()
        self.highlighter.clear()
        try:
            self.encoding = encoding or self.encoding
            self.eol = eol or self.eol

            file = open(
                self.path,
                "r",
                buffering=self.buffer_size,
                encoding=self.encoding,
                newline=self.eol,
            )

            self.queue = queue.Queue()
            threading.Thread(target=self.read_file, args=(file,)).start()
            self.process_queue()
        except Exception as e:
            print(e)
            if self.exists:
                self.master.unsupported_file()

        self.refresh()
        self.base.statusbar.on_open_file(self)

    def load_file(self):
        if not self.path or not self.exists:
            return

        if not textutils.is_text_file(self.path):
            if not askokcancel(
                "Binary File",
                "This file is a binary file, do you want to open it anyway?",
            ):
                # show unsupported file message and terminate content loading process
                return self.master.unsupported_file()
            else:
                # just set the flag to True so that we don't cache editor content
                self.master.unsupported = True
                self.unsupported = True

        self.clear()
        try:
            self.encoding = self.detect_encoding(self.path)
            file = open(
                self.path, "r", encoding=self.encoding, buffering=self.buffer_size
            )
            self.eol = textutils.get_default_newline()

            self.queue = queue.Queue()
            threading.Thread(target=self.read_file, args=(file,), daemon=True).start()
            self.process_queue()
        except Exception as e:
            print(e)
            if self.exists:
                self.master.unsupported_file()

        if not self.standalone:
            self.base.statusbar.on_open_file(self)

    def load_new_file(self, path: str):
        self.path = path
        self.load_file()
        self.highlighter.detect_language()
        self.highlighter.highlight()

    def load_text(self, text: str = "", eol: str = ""):
        self.clear()

        def write_with_buffer():
            buffer = deque(maxlen=self.buffer_size)
            for char in text:
                buffer.append(char)
                if len(buffer) >= self.buffer_size:
                    chunk = "".join(buffer)
                    if eol:
                        chunk.replace(self.eol or textutils.get_default_newline(), eol)
                    self.write(chunk)
                    self.update()
                    buffer.clear()
            if buffer:
                chunk = "".join(buffer)
                self.write(chunk)
                self.update()
            if eol:
                self.eol = eol

            if not self.standalone:
                self.base.statusbar.on_open_file(self)

        threading.Thread(target=write_with_buffer, daemon=True).start()

    def read_file(self, file: typing.TextIO):
        while True:
            try:
                chunk = file.read(self.buffer_size)
            except UnicodeDecodeError as e:
                print(e)
                self.master.unsupported_file()
                return
            if not chunk:
                file.close()
                self.queue.put(None)  # Signal the end of reading
                break
            self.queue.put(chunk)

    def process_queue(self, eol: str = None):
        try:
            while True:
                chunk = self.queue.get_nowait()
                if chunk is None:
                    # Finished loading file -- reached EOF 🚧
                    try:
                        self.master.on_change()
                        self.master.on_scroll()
                        self.update_idletasks()
                        self.master.file_loaded()
                        self.focus_set()
                    except Exception:
                        pass
                    break
                if eol:
                    chunk.replace(self.eol or textutils.get_default_newline(), eol)

                try:
                    self.write(chunk)
                    self.update()
                    self.master.on_scroll()
                except Exception:
                    # editor was closed during file load
                    return
        except queue.Empty:
            # If the queue is empty, schedule the next check after a short delay
            self.master.after(100, self.process_queue)

    def custom_get(self, start: str, end: str) -> str:
        """Ignore the text that is tagged with 'ignore_tag' and return the rest of the text."""

        content = self.get(start, end)
        tag_ranges = self.tag_ranges("ignore_tag")

        for tag_start, tag_end in zip(tag_ranges[0::2], tag_ranges[1::2]):
            content = content.replace(self.get(tag_start, tag_end), "")

        return content

    def save_file(self, path=None):
        if path:
            try:
                with open(path, "w") as fp:
                    fp.write(self.get_all_text())
            except Exception:
                return

            self.path = path
            # TODO update tab name

        try:
            with open(self.path, "w") as fp:
                fp.write(self.get_all_text())
        except Exception:
            return

    def event_focus_out(self, _: tk.Event):
        self.hide_autocomplete()
        self.hover.hide()

    def event_mouse_down(self, _: tk.Event):
        self.hide_autocomplete()
        self.hover.hide()

    def event_leave(self, _: tk.Event):
        self.hover.hide()

    def event_mapped(self, _):
        try:
            self.lsp = self.base.language_server_manager.tab_opened(self)
        except Exception as e:
            self.base.notifications.warning(
                f"{self.language} language server failed, check logs."
            )
            self.base.logger.error(f"{self.language} language server failed: {e}")
            self.lsp = False
            print(self.base.language_server_manager.langservers)

    def event_destroy(self, _):
        try:
            self.hide_autocomplete()
        except:
            # most likely because app was closed
            pass
        self.base.language_server_manager.request_removal(self)

    def event_unmapped(self, _):
        try:
            self.hide_autocomplete()
            self.base.outline.tree.update_symbols()
        except Exception:
            pass

    def copy(self, *_):
        self.event_generate("<<Copy>>")

    def cut(self, *_):
        self.event_generate("<<Cut>>")

    def paste(self, *_):
        self.event_generate("<<Paste>>")

    def clear(self) -> None:
        """Clear the entire text content"""

        self.delete(1.0, tk.END)

    def goto(self, position: str) -> None:
        """Moves cursor to the position passed as argument"""

        self.move_cursor(position)
        self.see(position)
        self.focus_set()

    def goto_line(self, line: str) -> None:
        """Moves cursor to the line passed as argument"""

        line = f"{line}.0"
        self.move_cursor(line)
        self.see(line)
        self.focus_set()

    def event_copy_line_up(self, *_) -> None:
        "copies the line cursor is in below"
        line = self.line
        next_line = str(int(line) + 1)
        self.insert(f"{next_line}.0", self.get(f"{line}.0", f"{line}.end"))
        return "break"

    def event_copy_line_down(self, *_) -> None:
        "copies the line cursor is in above"
        line = self.line
        prev_line = str(int(line) - 1)
        self.insert(f"{prev_line}.end", self.get(f"{line}.0", f"{line}.end"))
        return "break"

    def event_delete_line(self, *_) -> None:
        "deletes the line cursor is in"
        line = self.line
        self.delete(f"{line}.0", f"{line}.end")

    def event_move_line_up(self, *_) -> None:
        "moves the line cursor is in below"
        line = self.line
        next_line = str(int(line) + 1)
        self.insert(f"{next_line}.0", self.get(f"{line}.0", f"{line}.end"))
        self.delete(f"{line}.0", f"{line}.end")
        return "break"

    def event_move_line_down(self, *_) -> None:
        "moves the line cursor is in above"
        line = self.line
        prev_line = str(int(line) - 1)
        self.insert(f"{prev_line}.end", self.get(f"{line}.0", f"{line}.end"))
        self.delete(f"{line}.0", f"{line}.end")
        return "break"

    def event_duplicate_selection(self, *_) -> None:
        "duplicates the current selection"
        self.insert(tk.INSERT, self.selection)

    def write(self, text, *args):
        self.insert(tk.END, text, *args)

    def insert_newline(self, *args):
        self.write("\n", *args)

    def get_begin(self):
        return "1.0"

    def get_end(self):
        return self.index(tk.END + "-1c")

    def get_all_text(self):
        return self.get(1.0, tk.END)

    @property
    def selection(self) -> str:
        try:
            return self.selection_get()
        except Exception:
            return ""

    @property
    def line(self):
        try:
            return int(self.index(tk.INSERT).split(".")[0])
        except:
            return 1

    @property
    def column(self):
        try:
            return int(self.index(tk.INSERT).split(".")[1]) + 1
        except:
            return 1

    @property
    def position(self):
        try:
            lc = self.index(tk.INSERT).split(".")
            return [lc[0], int(lc[1]) + 1]
        except:
            return [1, 1]

    def scroll_to_end(self):
        self.mark_set(tk.INSERT, tk.END)
        self.see(tk.INSERT)

    def scroll_to_start(self):
        self.mark_set(tk.INSERT, 1.0)
        self.see(tk.INSERT)

    def scroll_to_line(self, line):
        self.mark_set(tk.INSERT, line)
        self.see(tk.INSERT)

    def set_wrap(self, flag=True):
        if flag:
            self.configure(wrap=tk.WORD)
        else:
            self.configure(wrap=tk.NONE)

    def set_active(self, flag=True):
        if flag:
            self.configure(state=tk.NORMAL)
        else:
            self.configure(state=tk.DISABLED)

    def show_unsupported_dialog(self):
        self.minimalist = True
        self.unsupported = True
        self.highlighter.lexer = None
        self.set_wrap(True)
        self.configure(font=("Arial", 10), padx=10, pady=10)
        self.write(
            "This file is not displayed in this editor because it is either binary or uses an unsupported text encoding."
        )
        self.set_active(False)

    def move_cursor(self, position):
        self.mark_set(tk.INSERT, position)

    def clear_all_selection(self):
        self.tag_remove(tk.SEL, 1.0, tk.END)

    def highlight_current_line(self, *_):
        self.tag_remove("currentline", 1.0, tk.END)
        if self.minimalist or self.tag_ranges(tk.SEL):
            return

        line = int(self.index(tk.INSERT).split(".")[0])
        start = str(float(line))
        end = str(float(line + 1))
        self.tag_add("currentline", start, end)

    def select_line(self, line):
        self.clear_all_selection()

        line = int(line.split(".")[0])
        start = str(float(line))
        end = str(float(line + 1))
        self.tag_add(tk.SEL, start, end)

        self.move_cursor(end)

    def highlight_current_word(self):
        self.tag_remove("currentword", 1.0, tk.END)
        if self.tag_ranges(tk.SEL):
            return

        if word := re.findall(r"\w+", self.get("insert wordstart", "insert wordend")):
            # TODO: do not highlight keywords, parts of strings, etc.
            self.highlight_pattern(f"\\y{word[0]}\\y", "currentword", regexp=True)
            # self.highlight_pattern(f"\\y{word[0]}\\y", "currentword", start="insert wordend", regexp=True)

    def highlight_pattern(self, pattern, tag, start="1.0", end=tk.END, regexp=False):
        start = self.index(start)
        end = self.index(end)

        self.mark_set("matchStart", start)
        self.mark_set("matchEnd", start)
        self.mark_set("searchLimit", end)

        self.tag_remove(tag, start, end)

        count = tk.IntVar()
        while True:
            index = self.search(
                pattern, "matchEnd", "searchLimit", count=count, regexp=regexp
            )
            if index == "" or count.get() == 0:
                break

            self.mark_set("matchStart", index)
            self.mark_set("matchEnd", f"{index}+{count.get()}c")

            self.tag_add(tag, "matchStart", "matchEnd")

    def stack_undo(self):
        if self._edit_stack_index > 0:
            self._edit_stack_index = self._edit_stack_index - 1
            self._user_edit = False
            self.clear()
            self.write(self._edit_stack[self._edit_stack_index][0][:-1])
            self.mark_set("insert", self._edit_stack[self._edit_stack_index][1])

    def stack_redo(self):
        if self._edit_stack_index + 1 < len(self._edit_stack):
            self._edit_stack_index = self._edit_stack_index + 1
            self._user_edit = False
            self.clear()
            self.write(self._edit_stack[self._edit_stack_index][0][:-1])
            self.mark_set("insert", self._edit_stack[self._edit_stack_index][1])

    def _been_modified(self, event=None):
        try:
            if self._user_edit:
                text = self.get_all_text()
                if (not self._edit_stack) or (
                    text != self._edit_stack[self._edit_stack_index][0]
                ):
                    # real modified
                    cursor_index = self.index(tk.INSERT)
                    if (self._edit_stack_index + 1) != len(self._edit_stack):
                        self._edit_stack = self._edit_stack[
                            : self._edit_stack_index + 1
                        ]
                    self._edit_stack.append([text, cursor_index])
                    self._edit_stack_index = self._edit_stack_index + 1
                    if self._edit_stack_index > 200:
                        self._edit_stack = self._edit_stack[
                            self._edit_stack_index - 50 : self._edit_stack_index + 1
                        ]
                        self._edit_stack_index = len(self._edit_stack) - 1
            if self._resetting_modified_flag:
                return
            self.clear_modified_flag()
        except:
            self.base.notifications.error("Edit stack error: please restart biscuit")

    def clear_modified_flag(self):
        self._resetting_modified_flag = True
        try:
            self.tk.call(self._w, "edit", "modified", 0)
        finally:
            self._resetting_modified_flag = False

    def create_proxy(self):
        self._orig = self._w + "_orig"
        self.tk.call("rename", self._w, self._orig)
        self.tk.createcommand(self._w, self._proxy)

    def _proxy(self, *args):
        if (
            args[0] == "get"
            and (args[1] == tk.SEL_FIRST and args[2] == tk.SEL_LAST)
            and not self.tag_ranges(tk.SEL)
        ):
            return
        if (
            args[0] == "delete"
            and (args[1] == tk.SEL_FIRST and args[2] == tk.SEL_LAST)
            and not self.tag_ranges(tk.SEL)
        ):
            return

        cmd = (self._orig,) + args
        try:
            result = self.tk.call(cmd)
        except Exception:
            return

        if args[0] in ("insert", "replace", "delete"):
            self.event_generate("<<Change>>", when="tail")
            if self.lsp:
                self.base.language_server_manager.content_changed(self)

        # if "insert" in args[0:3] and "get" in args[0:3]:
        #     print(temp)

        elif args[0:3] == ("mark", "set", "insert"):
            self.event_generate("<<Change>>", when="tail")
        elif (
            args[0:2] == ("xview", "moveto")
            or args[0:2] == ("yview", "moveto")
            or args[0:2] == ("xview", "scroll")
            or args[0:2] == ("yview", "scroll")
        ):
            self.event_generate("<<Scroll>>", when="tail")

        return result
