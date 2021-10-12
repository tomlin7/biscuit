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

        self.configure(font=self.master.font)
        self.create_proxy()

    def create_proxy(self):
        self._orig = self._w + "_orig"
        self.tk.call("rename", self._w, self._orig)
        self.tk.createcommand(self._w, self._proxy)

    def load_file(self, path):
        with open(path, 'r') as data:
            self.data = data.read()
            self.clear_insert()

    def clear_insert(self):
        self.clear()
        self.write(text=self.data)
        
    def clear(self):
        self.delete(1.0, tk.END)

    def write(self, text):
        self.insert(tk.END, text)

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
