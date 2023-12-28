from __future__ import annotations

import codecs
import queue
import re
import threading
import tkinter as tk
import typing
from collections import deque

if typing.TYPE_CHECKING:
    from biscuit.core.components.lsp.data import Jump, Underlines
    from biscuit.core.components.lsp.data import Completions
    from . import TextEditor

from ...utils import Text as BaseText
from .changes import Change
from .highlighter import Highlighter
from .hoverpopup import HoverPopup


class Text(BaseText):
    """Improved Text widget"""

    def __init__(self, master: TextEditor, path: str=None, exists: bool=True, minimalist: bool=False, language: str=None, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.path = path
        self.encoding = 'utf-8'
        self.eol = "CRLF"
        self.exists = exists
        self.minimalist = minimalist
        self.language = language

        self.buffer_size = 1000
        self.bom = True
        self.current_word = None
        self.words: list[str] = []
        self.lsp: bool = False

        self.hover_popup = HoverPopup(self)
        self.last_change = Change(None, None, None, None, None)
        self.highlighter = Highlighter(self, language)
        self.autocomplete = self.base.autocomplete
        self.base.statusbar.on_open_file(self)

        self.focus_set()
        self.config_tags()
        self.create_proxy()
        self.config_bindings()
        self.configure(wrap=tk.NONE, relief=tk.FLAT, highlightthickness=0, bd=0, **self.base.theme.editors.text)

        # modified event
        self.clear_modified_flag()
        self._user_edit = True
        self._edit_stack = []
        self._edit_stack_index = -1
        self._last_selection: list[str, str] = [None, None]
        self._last_cursor: list[str, str] = [None, None]
        self.hover_after = None
        self.last_hovered = None

    def config_tags(self):
        self.tag_config(tk.SEL, background=self.base.theme.editors.selection)
        self.tag_config('hyperlink', foreground=self.base.theme.editors.hyperlink, underline=True)
        self.tag_config("found", background=self.base.theme.editors.found)
        self.tag_config("foundcurrent", background=self.base.theme.editors.foundcurrent)
        self.tag_config("currentword", background=self.base.theme.editors.currentword)
        self.tag_config("currentline", background=self.base.theme.editors.currentline)

    def config_bindings(self):
        self.bind("<KeyRelease>", self.key_release_events) 

        self.bind("<Control-f>", self.open_find_replace)
        self.bind("<Control-g>", lambda _: self.base.palette.show_prompt(':'))
        self.bind("<Control-Left>", lambda _: self.handle_ctrl_hmovement())
        self.bind("<Control-Right>", lambda _: self.handle_ctrl_hmovement(True))

        self.bind("<Shift-Alt-Up>", self.event_copy_line_up)
        self.bind("<Shift-Alt-Down>", self.event_copy_line_down)
        self.bind("<Alt-Up>", self.event_move_line_up)
        self.bind("<Alt-Down>", self.event_move_line_down)

        self.bind("<Return>", self.enter_key_events)
        self.bind("<Tab>", self.tab_key_events)

        # undo-redo
        self.bind_all('<<Modified>>', self._been_modified)

        # pair completion
        self.bind("<braceleft>", self.complete_pair)
        self.bind("<bracketleft>", self.complete_pair)
        self.bind("<parenleft>", self.complete_pair)
        self.bind("<apostrophe>", self.complete_pair)
        self.bind("<quotedbl>", self.complete_pair)

        if self.minimalist:
            return

        # autocomplete
        self.bind("<FocusOut>", self.hide_autocomplete) 
        self.bind("<Button-1>", self.hide_autocomplete)
        self.bind("<Up>", self.autocomplete.move_up)
        self.bind("<Down>", self.autocomplete.move_down)

        # lspc
        self.bind("<Map>", self.event_mapped)
        self.bind("<Unmap>", self.event_unmapped)
        self.bind("<Destroy>", self.event_destroy)
        self.bind("<Motion>", self.request_hover)
        self.bind_all("<Control-KeyRelease>", self.clear_hyperlink)
        self.bind("<Control-Motion>", self.underline_for_jump)
        self.bind("<Control-Button-1>", self.request_goto_definition)
        self.bind("<Control-period>", lambda _: self.base.languageservermanager.request_completions(self))

    def key_release_events(self, event: tk.Event):
        self._user_edit = True
        
        match event.keysym.lower():
            case "button-2" | "backspace" | "escape" | "control_l" | "control_r" | "space" | "return" | "tab":
                self.hide_autocomplete()
            case "right" | "left":
                if self.autocomplete.active:
                    self.update_completions()

            case "up" | "down" | "shift_l" | "shift_r" | "alt_l" | "alt_r" | "meta_l" | "meta_r" | "shift" | "alt" | "meta":
                pass
            case "braceleft" | "bracketleft" | "parenleft" | "apostrophe" | "quotedbl":
                pass

            # extra spaces
            case ":" | ",":
                self.insert(tk.INSERT, " ")
            case _:
                if self.lsp:
                    self.request_autocomplete(event)
                else:
                    self.show_autocomplete(event)

        self.update_words_list()
    
    def complete_pair(self, e: tk.Event):
        end = {"(": ")", "{": "}", "[": "]", "\"": "\"", "'": "'"}.get(e.char)
        
        # if there is selection, surround the selection with character
        if self.tag_ranges(tk.SEL):
            self.insert(tk.SEL_LAST, end)
            self.insert(tk.SEL_FIRST, e.char)
            return "break"
        
        if e.char in ("\"", "'") and self.get("insert-1c", "insert").strip():
            return
        
        # if there is no selection, insert the character and move cursor inside the pair
        self.insert(tk.INSERT, e.char + end)
        self.mark_set(tk.INSERT, "insert-1c")
        return "break"

    def hide_autocomplete(self, *_):
        if self.minimalist:
            return

        self.autocomplete.hide()

    def show_autocomplete(self, event: tk.Event):
        if (self.minimalist or not self.current_word or event.keysym in ["Down", "Up"]): return
        if not self.current_word.strip().isalpha() or self.current_word.strip() != ".":
            self.hide_autocomplete()

        self.autocomplete.show(self)
        self.update_completions()
        
    def update_words_list(self, *_):
        if self.minimalist or self.lsp:
            return

        try:
            content = self.get(1.0, "insert-1c wordstart-1c") + " " + self.get("insert+1c", tk.END)
            self.words = list(set(re.findall(r"\w+", content)))
        except:
            pass

    def update_completions(self):
        if self.minimalist:
            return

        if self.lsp:
            self.request_autocomplete(self)
        else:
            self.autocomplete.update_completions(self)
            
    def replace_current_word(self, new_word):
        if self.current_word.startswith("\n"):
            self.delete("insert-1c wordstart+1c", "insert")
        else:
            self.delete("insert-1c wordstart", "insert")
        self.insert("insert", new_word)

    def cursor_screen_location(self):
        pos_x, pos_y = self.winfo_rootx(), self.winfo_rooty()

        cursor = tk.INSERT
        bbox = self.bbox(cursor)
        if not bbox:
            return (0, 0)

        bbx_x, bbx_y, _, bbx_h = bbox
        return (pos_x + bbx_x - 1, pos_y + bbx_y + bbx_h)

    def enter_key_events(self, *_):
        if not self.minimalist and self.autocomplete.active:        
            self.autocomplete.choose(self)
            return "break"

        return self.check_indentation()

    def tab_key_events(self, *_):
        if not self.minimalist and self.autocomplete.active:        
            self.autocomplete.choose(self)
            return "break"

        # TODO if there is text selected, indent the selected text
        self.insert(tk.INSERT, " "*4)
        return "break"

    def refresh(self):
        if self.minimalist:
            return

        self.current_word = self.get("insert-1c wordstart", "insert")
        self.highlighter.highlight()
        
        self.highlight_current_line()
        self.highlight_current_word()


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
        return bool(re.match("^[a-zA-Z][a-zA-Z0-9_]*$", text))

    def clear_hyperlink(self, e: tk.Event):
        print("cleared")
        self.tag_remove("hyperlink", 1.0, tk.END)

    def underline_for_jump(self, _):
        index = self.index(tk.CURRENT)
        word = self.get(index + " wordstart", index + " wordend").strip()
        if not word or not self.is_identifier(word):
            return

        self.tag_remove("hyperlink", 1.0, tk.END)
        self.tag_add("hyperlink", index + " wordstart", index + " wordend")

        return word

    def request_goto_definition(self, e: tk.Event):
        self.underline_for_jump(e)
        if self.underline_for_jump(e):
            self.base.languageservermanager.request_goto_definition(self)
    
    def request_hover(self, _):
        index = self.index(tk.CURRENT) # f"@{e.x},{e.y}"
        word = self.get(index + " wordstart", index + " wordend").strip()

        if not word or not self.is_identifier(word):
            self.hover_popup.hide()
            self.last_hovered = None
            return
        
        if self.last_hovered == word:
            return
        self.last_hovered = word
        
        # TODO delayed hovers
        # if self.hover_after:
        #     self.after_cancel(self.hover_after)
        
        # self.after(500, ...)
        self.base.languageservermanager.request_hover(self)

    def request_autocomplete(self, _):
        if self.minimalist:
            return
        
        if self.current_word.isalpha() or self.current_word.strip() == ".":
            return self.base.languageservermanager.request_completions(self)
        
        self.hide_autocomplete()

    def lsp_show_autocomplete(self, response: Completions) -> None:
        self.autocomplete.lsp_update_completions(self, response.completions)
    
    def lsp_diagnostics(self, response: Underlines) -> None: ...
        # print("LSP <<< ", response)
        # self.highlighter.highlight_diagnostics(response)
    
    def lsp_goto_definition(self, response: Jump) -> None:
        print("LSP <<< ", response)
    
    def lsp_hover(self, response: dict) -> None: ...
        # print("LSP <<< ", response)
        # self.base.languageservermanager.hover(response)

    def get_cursor_pos(self):
        return self.index(tk.INSERT)

    def get_mouse_pos(self):
        return self.index(tk.CURRENT)

    def get_current_word(self):
        return self.current_word.strip()

    def move_to_next_word(self):
        self.mark_set(tk.INSERT, self.index("insert+1c wordend"))

    def move_to_previous_word(self):
        self.mark_set(tk.INSERT, self.index("insert-1c wordstart"))

    def handle_ctrl_hmovement(self, delta=False):
        if delta:
            self.move_to_next_word()
        else:
            self.move_to_previous_word()

        return "break"

    def update_current_indent(self):
        line = self.get("insert linestart", "insert lineend")
        match = re.match(r'^(\s+)', line)
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
                self.current_indent += 4
            elif self.current_line[-1] in ["}", "]", ")"]:
                self.current_indent -= 4

            self.add_newline()
            self.insert(tk.INSERT, " " * self.current_indent)

            self.update_current_indent()

            return "break"

    def multi_selection(self, *args):
        #TODO: multi cursor editing
        return "break"

    def open_find_replace(self, *_):
        self.base.findreplace.show(self)

    def detect_encoding(self, file_path):
        with open(file_path, 'rb') as file:
            bom = file.read(4)

        if bom.startswith(codecs.BOM_UTF8):
            return 'utf-8'
        if bom.startswith(codecs.BOM_LE) or bom.startswith(codecs.BOM_BE):
            return 'utf-16'
        if bom.startswith(codecs.BOM32_BE) or bom.startswith(codecs.BOM32_LE):
            return 'utf-32'

        self.bom = False
        return 'utf-8'

    def detect_eol(self, path):
        with open(path, 'rb') as file:
            chunk = file.read(1024)

            # Check for '\r\n' to detect Windows-style EOL
            if b'\r\n' in chunk:
                return "CRLF"

            # Check for '\n' to detect Unix-style EOL
            if b'\n' in chunk:
                return "LF"

            # Check for '\r' to detect Mac-style EOL (older Macs)
            if b'\r' in chunk:
                return "CR"
            return "UNKNOWN"

    def load_file(self):
        if not self.path:
            return

        try:
            encoding = self.detect_encoding(self.path)
            self.detect_eol(self.path)
            file = open(self.path, 'r', encoding=encoding)
            self.encoding = encoding

            self.queue = queue.Queue()
            threading.Thread(target=self.read_file, args=(file,)).start()
            self.process_queue()
        except Exception as e:
            print(e)
            self.master.unsupported_file()

        self.base.statusbar.on_open_file(self)

    def load_text(self, text: str=""):
        self.clear()

        def write_with_buffer():
            buffer = deque(maxlen=self.buffer_size)
            for char in text:
                buffer.append(char)
                if len(buffer) >= self.buffer_size:
                    chunk = ''.join(buffer)
                    self.write(chunk)
                    self.update()
                    buffer.clear()
            if buffer:
                chunk = ''.join(buffer)
                self.write(chunk)
                self.update()

        threading.Thread(target=write_with_buffer).start()

    def read_file(self, file):
        while True:
            try:
                chunk = file.read(self.buffer_size)
            except UnicodeDecodeError:
                self.master.unsupported_file()
                return
            if not chunk:
                file.close()
                self.queue.put(None)  # Signal the end of reading
                break
            self.queue.put(chunk)

    def process_queue(self):
        try:
            while True:
                chunk = self.queue.get_nowait()
                if chunk is None:
                    self.master.on_change()
                    self.master.on_scroll()
                    break
                self.write(chunk)
                self.update()
                self.master.on_scroll()
        except queue.Empty:
            # If the queue is empty, schedule the next check after a short delay
            self.master.after(100, self.process_queue)

    def save_file(self, path=None):
        if path:
            try:
                with open(path, 'w') as fp:
                    fp.write(self.get_all_text())
            except Exception:
                return

            self.path = path
            #TODO update tab name

        try:
            with open(self.path, 'w') as fp:
                fp.write(self.get_all_text())
        except Exception:
            return
    
    def event_mapped(self, _):
        self.lsp = self.base.languageservermanager.tab_opened(self)
    
    def event_destroy(self, _):
        try:
            self.hide_autocomplete()
        except:
            # most likely because app was closed
            pass
        self.base.languageservermanager.request_removal(self)

    def event_unmapped(self, _):
        self.hide_autocomplete()
        self.base.languageservermanager.tab_closed(self)
        
    def event_copy(self, *_):
        self.event_generate("<<Copy>>")

    def event_cut(self, *_):
        self.event_generate("<<Cut>>")

    def event_paste(self, *_):
        self.event_generate("<<Paste>>")

    def clear(self) -> None:
        """Clear the entire text content"""

        self.delete(1.0, tk.END)

    def goto(self, line: str) -> None:
        """Moves cursor to the line passed as argument"""

        line = f"{line}.0"
        self.move_cursor(line)
        self.see(line)

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
        return '1.0'
    
    def get_end(self):
        return self.index(tk.END)

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
        return int(self.index(tk.INSERT).split('.')[0])

    @property
    def column(self):
        return int(self.index(tk.INSERT).split('.')[1]) + 1

    @property
    def position(self):
        lc = self.index(tk.INSERT).split('.')
        return [lc[0], int(lc[1]) + 1]

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
        self.highlighter.lexer = None
        self.set_wrap(True)
        self.configure(font=('Arial', 10), padx=10, pady=10)
        self.write("This file is not displayed in this editor because it is either binary or uses an unsupported text encoding.")
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
        if self.minimalist or self.tag_ranges(tk.SEL):
            return

        if word := re.findall(r"\w+", self.get("insert wordstart", "insert wordend")):
            # TODO: do not highlight keywords, parts of strings, etc.
            self.highlight_pattern(f"\\y{word[0]}\\y", "currentword", regexp=True)

    def highlight_pattern(self, pattern, tag, start="1.0", end=tk.END, regexp=False):
        start = self.index(start)
        end = self.index(end)

        self.mark_set("matchStart", start)
        self.mark_set("matchEnd", start)
        self.mark_set("searchLimit", end)

        self.tag_remove(tag, start, end)

        count = tk.IntVar()
        while True:
            index = self.search(pattern, "matchEnd", "searchLimit", count=count, regexp=regexp)
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
                if (not self._edit_stack) or (text != self._edit_stack[self._edit_stack_index][0]):
                    # real modified
                    cursor_index = self.index(tk.INSERT)
                    if (self._edit_stack_index + 1) != len(self._edit_stack):
                        self._edit_stack = self._edit_stack[:self._edit_stack_index+1]
                    self._edit_stack.append([text, cursor_index])
                    self._edit_stack_index = self._edit_stack_index + 1
                    if self._edit_stack_index > 200:
                        self._edit_stack = self._edit_stack[self._edit_stack_index-50:self._edit_stack_index+1]
                        self._edit_stack_index = len(self._edit_stack)-1
            if self._resetting_modified_flag:
                return
            self.clear_modified_flag()
        except:
            self.base.notifications.error("Edit stack error: please restart biscuit")

    def clear_modified_flag(self):
        self._resetting_modified_flag = True
        try:
            self.tk.call(self._w, 'edit', 'modified', 0)
        finally:
            self._resetting_modified_flag = False

    def create_proxy(self):
        self._orig = self._w + "_orig"
        self.tk.call("rename", self._w, self._orig)
        self.tk.createcommand(self._w, self._proxy)

    def _proxy(self, *args):
        if args[0] == 'get' and (args[1] == tk.SEL_FIRST and args[2] == tk.SEL_LAST) and not self.tag_ranges(tk.SEL): 
            return
        if args[0] == 'delete' and (args[1] == tk.SEL_FIRST and args[2] == tk.SEL_LAST) and not self.tag_ranges(tk.SEL): 
            return

        cmd = (self._orig,) + args
        result = self.tk.call(cmd)

        if (args[0] in ("insert", "replace", "delete")):
            self.event_generate("<<Change>>", when="tail")
            if self.lsp:
                self.base.languageservermanager.content_changed(self)

        # if "insert" in args[0:3] and "get" in args[0:3]:
        #     print(temp)
        
        elif args[0:3] == ("mark", "set", "insert"):
            self.event_generate("<<Change>>", when="tail")
        elif (args[0:2] == ("xview", "moveto") or args[0:2] == ("yview", "moveto") or 
              args[0:2] == ("xview", "scroll") or args[0:2] == ("yview", "scroll")):
            self.event_generate("<<Scroll>>", when="tail")

        return result
