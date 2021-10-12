import tkinter as tk
import tkinter.font as Font

from lib.components.text.utils import Utils

class Text(tk.Text):
    def __init__(self, master, path=None, exists=None, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base

        self.path = path
        self.data = None

        self.font = self.base.settings.font
        # self.settings_font = self.base.settings.font
        # self.font = tk.font.Font(
        #     family=self.settings_font['family'], 
        #     size=self.settings_font['size'], 
        #     weight=self.settings_font['weight'])
        
        self.zoom = self.font["size"]

        if exists:
            self.load_file(self.path)

        self.configure(font=self.font)
        self.create_proxy()
        self.setup_bindings()

    def setup_bindings(self):
        self.bind("<Control-MouseWheel>", self.handle_zoom)

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

    def set_fontsize(self, size):
        self.font.configure(size=size)
    
    def handle_zoom(self, event):
        if 5 <= self.zoom <= 50:
            if event.delta < 0:
                self.zoom -= 1
            else:
                self.zoom += 1
        self.zoom = Utils.clamp(self.zoom, 5, 50)
        
        self.refresh_fontsize()
        return "break"

    def refresh_fontsize(self):
        self.set_fontsize(self.zoom)

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
