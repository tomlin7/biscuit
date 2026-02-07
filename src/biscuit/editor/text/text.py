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
from editorconfig import EditorConfigError
from editorconfig import get_properties as get_editorconfig

from biscuit.common.minclosestdict import MinClosestKeyDict
from biscuit.common.textindex import TextIndex
from biscuit.language.data import Diagnostic

if typing.TYPE_CHECKING:
    from biscuit.language.data import (
        Completions,
        Diagnostic,
        HoverResponse,
        Jump,
        WorkspaceEdits,
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
        self.relative_line_numbers = self.base.relative_line_numbers

        self.ctrl_down = False
        self.buffer_size = 4096
        self.bom = True
        self.current_word = None
        self.words: list[str] = []
        self.lsp: bool = False
        self.current_indent_level = 0
        self.insert_final_newline = False
        self.indent_guides: list[tk.Frame] = []
        self.indent_guide_pool: list[tk.Frame] = []
        self.active_indent_level = -1
        self.active_start_line = -1
        self.active_end_line = -1

        self.hover_after = None
        self.last_hovered = None
        self.tab_spaces = self.base.tab_spaces

        try:
            self.editorconfig = get_editorconfig(self.path)

            self.insert_final_newline = self.editorconfig.get(
                "insert_final_newline", False
            )
            self.eol = self.editorconfig.get("end_of_line", "CRLF")
            self.encoding = self.editorconfig.get("charset", "utf-8")
            self.tab_spaces = int(self.editorconfig.get("indent_size", 4))
        except EditorConfigError:
            self.editorconfig = {}

        # self.last_change = Change(None, None, None, None, None)
        self._pending_edit_info = None
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
        tab_width = self.base.settings.font.measure(" " * self.tab_spaces)
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
            background=self.base.theme.editors.indent_guide,
        )
        self.tag_configure(
            "current_indent_guide",
            background=self.base.theme.editors.indent_guide_active,
        )

        self.tag_raise(tk.SEL, "hover")
        self.tag_raise(tk.SEL, "currentline")
        self.tag_raise(tk.SEL, "currentword")
        self.tag_raise("currentword", "currentline")
        self.tag_raise("currentline", "indent_guide")
        self.tag_raise("currentline", "current_indent_guide")

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
        if self.minimalist or not self.base.config.render_indent_guides:
            for guide in self.indent_guides:
                guide.place_forget()
            self.indent_guide_pool.extend(self.indent_guides)
            self.indent_guides = []
            return

        try:
            first_line = int(self.index("@0,0").split(".")[0])
            last_line = int(self.index(f"@0,{self.winfo_height()}").split(".")[0])
        except Exception:
            return
        
        # Buffer for smooth scrolling
        first_line = max(1, first_line - 5)
        last_line = min(int(self.index(tk.END).split(".")[0]), last_line + 5)

        # Clear existing guides
        for guide in self.indent_guides:
            guide.place_forget()
        self.indent_guide_pool.extend(self.indent_guides)
        self.indent_guides = []

        self.get_active_block_info()

        # Cache indentation levels to handle empty lines better
        indents = {}
        for line_number in range(first_line, last_line + 1):
            line = self.get(f"{line_number}.0", f"{line_number}.end")
            if line.strip():
                indents[line_number] = self.calculate_indent_level(line)
            else:
                indents[line_number] = -1 # Mark as empty

        for line_number in range(first_line, last_line + 1):
            indent_level = indents[line_number]
            if indent_level == -1:
                prev_indent = 0
                for l in range(line_number - 1, max(1, line_number - 50), -1):
                    if l in indents and indents[l] != -1:
                        prev_indent = indents[l]
                        break
                
                next_indent = 0
                for l in range(line_number + 1, min(last_line + 60, line_number + 50)):
                    # Check beyond last_line if needed
                    cached = indents.get(l)
                    if cached is not None and cached != -1:
                        next_indent = cached
                        break
                    elif cached is None:
                        # Fetch and cache
                        line = self.get(f"{l}.0", f"{l}.end")
                        if line.strip():
                            next_indent = self.calculate_indent_level(line)
                            indents[l] = next_indent
                            break
                        else:
                            indents[l] = -1
                
                indent_level = min(prev_indent, next_indent) if next_indent > 0 else prev_indent

            if indent_level > 0:
                self.add_indent_guides_to_line(line_number, indent_level)

    def calculate_indent_level(self, line: str) -> int:
        expanded = line.expandtabs(self.tab_spaces)
        indent = len(expanded) - len(expanded.lstrip())
        return indent // self.tab_spaces

    def get_char_index_at_col(self, line: str, col: int) -> int:
        current_col = 0
        for i, char in enumerate(line):
            if current_col >= col:
                return i
            if char == "\t":
                current_col += self.tab_spaces - (current_col % self.tab_spaces)
            else:
                current_col += 1
        return len(line)

    def add_indent_guides_to_line(self, line_number: int, indent_level: int) -> None:
        line = self.get(f"{line_number}.0", f"{line_number}.end")
        for level in range(indent_level):
            col = level * self.tab_spaces
            char_idx = self.get_char_index_at_col(line, col)
            
            idx = f"{line_number}.{char_idx}"
            bbox = self.bbox(idx)
            if not bbox:
                continue
            
            x, y, w, h = bbox
            
            # Use a frame from the pool or create a new one
            if self.indent_guide_pool:
                guide = self.indent_guide_pool.pop()
            else:
                guide = tk.Frame(self, width=1, highlightthickness=0, bd=0)
            
            guide.config(
                bg=(
                    self.base.theme.editors.indent_guide_active
                    if (
                        level == self.active_indent_level
                        and self.active_start_line <= line_number <= self.active_end_line
                    )
                    else self.base.theme.editors.indent_guide
                )
            )
            guide.bind("<Button-1>", lambda _, idx=idx: self.goto(idx))
            guide.place(x=x, y=y, width=1, height=h)
            self.indent_guides.append(guide)

    def get_active_block_info(self) -> None:
        self.active_indent_level = -1
        self.active_start_line = -1
        self.active_end_line = -1

        if self.highlighter and self.highlighter.ts and self.highlighter.ts.tree:
            try:
                line, col = self._tk_index_to_point(tk.INSERT)
                node = self.highlighter.ts.tree.root_node.descendant_for_point_range(
                    (line, col), (line, col)
                )

                # Block-like node types across various languages
                BLOCK_TYPES = (
                    "block", "compound_statement", "function_definition", "method_definition", 
                    "class_definition", "if_statement", "for_statement", "while_statement", 
                    "do_statement", "try_statement", "with_statement", "switch_statement", 
                    "match_expression", "match_arm", "unsafe_block", "impl_item", "trait_item", 
                    "enum_definition", "struct_definition", "union_definition", "macro_definition", 
                    "macro_invocation", "lambda", "argument_list", "parameters", "binary_expression",
                    "parenthesized_expression", "array_expression", "dictionary_expression", 
                    "list_expression", "set_expression", "tuple_expression", "object_expression",
                    "module", "translation_unit"
                )

                # Find the innermost block-like node that spans multiple lines
                temp = node
                while temp:
                    if temp.type in BLOCK_TYPES:
                        # Only consider it an active block if it spans multiple lines
                        # or if it's the only block we have.
                        if temp.start_point[0] != temp.end_point[0] or temp.parent is None:
                            # For standard 'block' nodes (the actual { } content), 
                            # we usually want to align with the parent keyword's indentation.
                            if temp.type == "block" and temp.parent:
                                self.active_indent_level = temp.parent.start_point[1] // self.tab_spaces
                            else:
                                self.active_indent_level = temp.start_point[1] // self.tab_spaces
                                
                            self.active_start_line = temp.start_point[0] + 1
                            self.active_end_line = temp.end_point[0] + 1
                            return
                    temp = temp.parent
            except Exception:
                pass

        # Fallback to current line's indentation level
        line_content = self.get("insert linestart", "insert lineend")
        self.active_indent_level = self.calculate_indent_level(line_content) - 1
        self.active_start_line = 1
        self.active_end_line = int(self.index(tk.END).split(".")[0])

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
                self.get(f"{line}.0", f"{line}.{len(self.comment_prefix) + 1}")
                == f"{self.comment_prefix} "
            ):
                self.delete(f"{line}.0", f"{line}.{len(self.comment_prefix) + 1}")
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
                or self.get(f"{line}.0", f"{line}.{self.tab_spaces}")
                == " " * self.tab_spaces
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
        if self._pending_edit_info and hasattr(
            self.highlighter, "incremental_highlight"
        ):
            self.highlighter.incremental_highlight(self._pending_edit_info)
            self._pending_edit_info = None
        else:
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

    def toggle_relative_numbering(self) -> None:
        self.relative_line_numbers = not self.relative_line_numbers
        self.master.on_change()

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
                self.current_indent += self.tab_spaces
            elif self.current_line[-1] in ["}", "]", ")"]:
                self.current_indent -= self.tab_spaces

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
        if self.insert_final_newline:
            if not self.get("end-2c", "end-1c").endswith("\n"):
                self.add_newline()

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
        if self.minimalist or self.tag_ranges(tk.SEL):
            self.tag_remove("currentline", 1.0, tk.END)
            return

        line = int(self.index(tk.INSERT).split(".")[0])
        start = f"{line}.0"
        end = f"{line + 1}.0"
        
        # Only update if the line actually changed
        current_ranges = self.tag_ranges("currentline")
        if current_ranges and self.index(current_ranges[0]) == self.index(start):
            return

        self.tag_remove("currentline", 1.0, tk.END)
        self.tag_add("currentline", start, end)

    def select_line(self, line):
        self.clear_all_selection()

        line = int(line.split(".")[0])
        start = str(float(line))
        end = str(float(line + 1))
        self.tag_add(tk.SEL, start, end)

        self.move_cursor(end)

    def highlight_current_word(self):
        if self.tag_ranges(tk.SEL):
            self.tag_remove("currentword", 1.0, tk.END)
            return

        word_range = self.tag_ranges(tk.INSERT + " wordstart") # dummy to get word
        # This is a bit tricky, let's just use the current simple logic but only if insertion changed
        
        new_word = self.get("insert wordstart", "insert wordend").strip()
        if not new_word or not re.match(r"^\w+$", new_word):
            self.tag_remove("currentword", 1.0, tk.END)
            return

        # Optimization: only re-highlight if the word is different
        # (This is still a bit expensive as it searches the whole file)
        # But we can limit the search to visible range!
        first_line = int(self.index("@0,0").split(".")[0])
        last_line = int(self.index(f"@0,{self.winfo_height()}").split(".")[0])
        
        self.tag_remove("currentword", 1.0, tk.END)
        self.highlight_pattern(f"\\y{new_word}\\y", "currentword", start=f"{first_line}.0", end=f"{last_line + 1}.0", regexp=True)

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

    def _is_sel_op_without_sel(self, args) -> bool:
        """Check if this is a get/delete on selection when nothing is selected."""
        return (
            len(args) >= 3
            and args[1] == tk.SEL_FIRST
            and args[2] == tk.SEL_LAST
            and not self.tag_ranges(tk.SEL)
        )

    def _is_scroll_op(self, args) -> bool:
        """Check if this is a scroll operation."""
        return args[0:2] in (
            ("xview", "moveto"),
            ("yview", "moveto"),
            ("xview", "scroll"),
            ("yview", "scroll"),
        )

    def _notify_lsp_change(self):
        """Notify LSP server of content change if active."""
        if self.lsp:
            try:
                self.base.language_server_manager.content_changed(self)
            except Exception:
                pass

    def _proxy(self, *args):
        if args[0] in ("get", "delete") and self._is_sel_op_without_sel(args):
            return

        is_edit = args[0] in ("insert", "replace", "delete")
        edit_info = self._capture_edit_info_before(args) if is_edit else None

        cmd = (self._orig,) + args
        try:
            result = self.tk.call(cmd)
        except Exception:
            return

        if is_edit:
            if edit_info:
                self._finalize_edit_info(edit_info, args)
            self.event_generate("<<Change>>", when="tail")
            self._notify_lsp_change()
        elif args[0:3] == ("mark", "set", "insert"):
            self.event_generate("<<Change>>", when="tail")
        elif self._is_scroll_op(args):
            self.event_generate("<<Scroll>>", when="tail")

        return result

    def _tk_index_to_point(self, index: str) -> tuple[int, int]:
        """Convert a Tk text index to a Tree-sitter (row, col) point."""
        try:
            pos = self.tk.call(self._orig, "index", index)
            line, col = str(pos).split(".")
            return (int(line) - 1, int(col))
        except Exception:
            return (0, 0)

    def _point_to_byte(self, point: tuple[int, int]) -> int:
        """Compute byte offset from a (row, col) point.

        Gets all text from start to the position in a single Tk call,
        then computes its UTF-8 byte length.
        """
        try:
            row, col = point
            tk_index = f"{row + 1}.{col}"
            text_before = self.tk.call(self._orig, "get", "1.0", tk_index)
            return len(str(text_before).encode("utf-8"))
        except Exception:
            return 0

    def _capture_edit_info_before(self, args) -> dict | None:
        """Capture position info before an edit operation executes."""
        try:
            if args[0] == "insert":
                # args: ("insert", index, text, ?tags, ?text, ?tags, ...)
                start_point = self._tk_index_to_point(args[1])
                start_byte = self._point_to_byte(start_point)
                return {
                    "op": "insert",
                    "start_byte": start_byte,
                    "old_end_byte": start_byte,
                    "start_point": start_point,
                    "old_end_point": start_point,
                }
            elif args[0] == "delete":
                # args: ("delete", start, ?end)
                start_point = self._tk_index_to_point(args[1])
                start_byte = self._point_to_byte(start_point)
                if len(args) > 2:
                    end_point = self._tk_index_to_point(args[2])
                else:
                    # Single char delete
                    end_point = self._tk_index_to_point(f"{args[1]} +1c")
                end_byte = self._point_to_byte(end_point)
                return {
                    "op": "delete",
                    "start_byte": start_byte,
                    "old_end_byte": end_byte,
                    "start_point": start_point,
                    "old_end_point": end_point,
                }
            elif args[0] == "replace":
                # args: ("replace", start, end, text)
                start_point = self._tk_index_to_point(args[1])
                start_byte = self._point_to_byte(start_point)
                end_point = self._tk_index_to_point(args[2])
                end_byte = self._point_to_byte(end_point)
                return {
                    "op": "replace",
                    "start_byte": start_byte,
                    "old_end_byte": end_byte,
                    "start_point": start_point,
                    "old_end_point": end_point,
                }
        except Exception:
            pass
        return None

    def _finalize_edit_info(self, edit_info: dict, args) -> None:
        """Compute new_end after the edit and store as pending edit info."""
        try:
            if edit_info["op"] == "insert":
                # Compute new end from inserted text
                # Collect all text parts (args may have: index, text, tags, text, tags, ...)
                texts = []
                i = 2
                while i < len(args):
                    texts.append(str(args[i]))
                    i += 2  # skip tags
                inserted = "".join(texts)
                inserted_bytes = len(inserted.encode("utf-8"))
                new_end_byte = edit_info["start_byte"] + inserted_bytes
                # Compute new end point
                lines = inserted.split("\n")
                if len(lines) == 1:
                    new_end_point = (
                        edit_info["start_point"][0],
                        edit_info["start_point"][1] + len(lines[0]),
                    )
                else:
                    new_end_point = (
                        edit_info["start_point"][0] + len(lines) - 1,
                        len(lines[-1]),
                    )
                edit_info["new_end_byte"] = new_end_byte
                edit_info["new_end_point"] = new_end_point

            elif edit_info["op"] == "delete":
                # After delete, new end = start (deleted region collapsed)
                edit_info["new_end_byte"] = edit_info["start_byte"]
                edit_info["new_end_point"] = edit_info["start_point"]

            elif edit_info["op"] == "replace":
                # Compute new end from replacement text
                replacement = str(args[3]) if len(args) > 3 else ""
                replacement_bytes = len(replacement.encode("utf-8"))
                new_end_byte = edit_info["start_byte"] + replacement_bytes
                lines = replacement.split("\n")
                if len(lines) == 1:
                    new_end_point = (
                        edit_info["start_point"][0],
                        edit_info["start_point"][1] + len(lines[0]),
                    )
                else:
                    new_end_point = (
                        edit_info["start_point"][0] + len(lines) - 1,
                        len(lines[-1]),
                    )
                edit_info["new_end_byte"] = new_end_byte
                edit_info["new_end_point"] = new_end_point

            self._pending_edit_info = edit_info
        except Exception:
            self._pending_edit_info = None
