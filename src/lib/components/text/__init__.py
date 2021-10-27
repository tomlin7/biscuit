import tkinter as tk

class Text(tk.Text):
    def __init__(self, master, path=None, exists=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        self.master = master
        
        self.path = path
        self.data = None

        if exists:
            self.load_file(self.path)

        self.configure(font=self.master.font, wrap=tk.NONE)
        self.create_proxy()

    def create_proxy(self):
        self._orig = self._w + "_orig"
        self.tk.call("rename", self._w, self._orig)
        self.tk.createcommand(self._w, self._proxy)

    def load_file(self, path):
        try:
            with open(path, 'r') as data:
                self.data = data.read()
                self.clear_insert()
        except:
            self.set_wrap(True)
            self.data = "This file is not displayed in this editor because it is either binary \nor uses an unsupported text encoding. Do you want to open it anyway? Nope"
            self.clear_insert()
            self.set_active(False)

    def clear_insert(self):
        self.clear()
        self.write(text=self.data)
        self.scroll_to_start()
        
    def clear(self):
        self.delete(1.0, tk.END)

    def write(self, text):
        self.insert(tk.END, text)
    
    def get_all_text(self):
        return self.get(1.0, tk.END)
    
    def get_selected_text(self):
        try:
            return self.selection_get()
        except Exception:
            return ""

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
        self.see(tk.END)
        self.mark_set(tk.INSERT, tk.END)
        self.see(tk.INSERT)
    
    def scroll_to_start(self):
        self.see(1.0)
        self.mark_set(tk.INSERT, 1.0)
        self.see(tk.INSERT)
    
    def scroll_to_line(self, line):
        self.see(line)
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
