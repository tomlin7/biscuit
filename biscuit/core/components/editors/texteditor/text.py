import re
import tkinter as tk

from .highlighter import Highlighter
from .autocomplete import AutoComplete

class Text(tk.Text):
    def __init__(self, master, path=None, exists=True, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master
        
        self.path = path
        self.data = None
        self.exists = exists

        self.lsp = self.base.lsp
        self.keywords = self.base.lsp.keywords

        self.highlighter = Highlighter(self)

        self.current_word = None
        self.words = []
        self.auto_completion = AutoComplete(
            self, items=self.lsp.get_autocomplete_list())

        self.configure(wrap=tk.NONE, relief=tk.FLAT, bg="white")
        self.tag_config(tk.SEL, background="#b98852")
        
        self.focus_set()
        self.config_tags()
        self.create_proxy()
        self.config_bindings()

        self.update_words()

    def config_tags(self):
        self.tag_config(tk.SEL, background="#dc8c34")
        self.tag_config("highlight", background="#dca66b")

    def config_bindings(self):
        self.bind("<KeyRelease>", self.key_release_events) 
        self.bind("<FocusOut>", self.hide_autocomplete) 
        self.bind("<Button-1>", self.hide_autocomplete)
        
        self.bind("<Up>", self.auto_completion.move_up)
        self.bind("<Down>", self.auto_completion.move_down)

        self.bind("<Return>", self.enter_key_events)
        self.bind("<Tab>", self.tab_key_events)

    def key_release_events(self, event):
        if event.keysym not in ("Up", "Down", "Return"):
            self.show_autocomplete(event)

        match event.keysym:
            # autocompletion keys
            case "Button-2" | "BackSpace" | "Escape" | "Control_L" | "Control_R" | "space":
                self.hide_autocomplete()
            case "rightarrow" | "leftarrow":
                self.update_completions()
            
            case _:
                pass

    def enter_key_events(self, *_):
        return self.tab_key_events()
        
    def tab_key_events(self, *_):
        if self.auto_completion.active:        
            self.auto_completion.choose()
            return "break"
    
    def get_all_text(self, *args):
        return self.get(1.0, tk.END)

    def get_all_text_ac(self, *args):
        """
        Helper function for autocomplete.show
        extracts all text except the current word.
        """
        return self.get(1.0, "insert-1c wordstart-1c") + self.get("insert+1c", tk.END)
    
    def get_current_word(self):
        return self.current_word.strip()
    
    def get_all_words(self, *args):
        return self.words

    def update_words(self, *_):
        self.words = list(set(re.findall(r"\w+", self.get_all_text_ac())))
        self.after(1000, self.update_words)
    
    def update_completions(self):
        self.auto_completion.update_completions()   
    
    def confirm_autocomplete(self, text):
        self.replace_current_word(text)
        
    def replace_current_word(self, new_word):
        if self.current_word.startswith("\n"):
            self.delete("insert-1c wordstart+1c", "insert")
        else:
            self.delete("insert-1c wordstart", "insert")
        self.insert("insert", new_word)
    
    def check_autocomplete_keys(self, event):
        """
        Helper function for autocomplete.show to check triggers
        """
        return True if event.keysym not in [
            "BackSpace", "Escape", "Return", "Tab", "space", 
            "Up", "Down", "Control_L", "Control_R"] else False 
    
    def cursor_screen_location(self):
        """
        Helper function for autocomplete.show to detect cursor location
        """
        pos_x, pos_y = self.winfo_rootx(), self.winfo_rooty()

        cursor = tk.INSERT
        bbox = self.bbox(cursor)
        if not bbox:
            return (0, 0)
        
        bbx_x, bbx_y, _, bbx_h = bbox
        return (pos_x + bbx_x - 1, pos_y + bbx_y + bbx_h)
    
    def hide_autocomplete(self, *_):
        self.auto_completion.hide()
    
    def show_autocomplete(self, event):
        if not self.check_autocomplete_keys(event):
            return
        
        if self.current_word.strip() not in ["{", "}", ":", "", None, "\""]:
            if not self.auto_completion.active:
                if event.keysym in ["Left", "Right"]:
                    return
                pos = self.cursor_screen_location()
                self.auto_completion.show(pos)
                self.auto_completion.update_completions()
            else:
                self.auto_completion.update_completions()
        else:
            if self.auto_completion.active:
                self.hide_autocomplete()

    def load_file(self):
        try:
            with open(self.path, 'r') as data:
                self.set_data(data.read())
                self.clear_insert()
        except Exception:
            self.master.unsupported_file()
    
    def copy(self, *_):
        self.event_generate("<<Copy>>")

    def cut(self, *_):
        self.event_generate("<<Cut>>")
    
    def paste(self, *_):
        self.event_generate("<<Paste>>")

    def set_data(self, data):
        self.data = data

    def clear_insert(self, text=None):
        self.clear()
        if text:
            self.set_data(text)
        self.write(text=self.data)
        self.scroll_to_start()
        
    def clear(self):
        self.delete(1.0, tk.END)

    def write(self, text, *args):
        self.insert(tk.END, text, *args)
    
    def newline(self, *args):
        self.write("\n", *args)
    
    def get_all_text(self):
        return self.get(1.0, tk.END)
    
    def get_selected_text(self):
        try:
            return self.selection_get()
        except Exception:
            return ""
        
    def add_newline(self, count=1):
        self.insert(tk.INSERT, "\n" * count)

    def get_selected_count(self):
        return len(self.get_selected_text())
        
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
        self.set_wrap(True)
        self.configure(font=('Arial', 10), padx=10, pady=10)
        self.data = "This file is not displayed in this editor because it is either binary or uses an unsupported text encoding."
        self.clear_insert()
        self.set_active(False)

    def move_cursor(self, position):
        self.mark_set(tk.INSERT, position)

    def clear_all_selection(self):
        self.tag_remove(tk.SEL, 1.0, tk.END)
    
    def select_line(self, line):
        self.clear_all_selection()
        
        line = int(line.split(".")[0])
        start = str(float(line))
        end = str(float(line + 1))
        self.tag_add(tk.SEL, start, end)

        self.move_cursor(end)
    
    def highlight_current_word(self):
        self.tag_remove("highlight", 1.0, tk.END)
        text = self.get("insert wordstart", "insert wordend")
        word = re.findall(r"\w+", text)
        if any(word):
            if word[0] not in self.keywords:
                self.highlight_pattern(f"\\y{word[0]}\\y", "highlight", regexp=True)

  
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

    def on_change(self, *args):
        self.current_word = self.get("insert-1c wordstart", "insert")
        self.highlight_current_word()
        self.highlighter.highlight()

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

        if (args[0] in ("insert", "replace", "delete") or 
            args[0:3] == ("mark", "set", "insert") or
            args[0:2] == ("xview", "moveto") or
            args[0:2] == ("xview", "scroll") or
            args[0:2] == ("yview", "moveto") or
            args[0:2] == ("yview", "scroll")
        ):
            self.event_generate("<<Change>>", when="tail")
            
        return result
