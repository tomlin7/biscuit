import textwrap
import tkinter as tk

from .frame import Frame


class Label(tk.Label):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base


class WrappingLabel(Label):
    """
    a type of Label that automatically adjusts the wrap to the size
    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.bind('<Configure>', lambda e: self.config(wraplength=self.winfo_width()))


class TruncatedLabel(Frame):
    """
    NOTE: Doesnt work currently
    """
    def __init__(self, master, text, *args, **kwargs):
        super().__init__(master)
        self.text = text
        self.pack_propagate(False)
        
        self.label = Label(self, text=text, *args, **kwargs)
        self.label.pack(fill="both", expand=True)
        
        self.bind("<Configure>", self._wrap_text)
        
    def _wrap_text(self, event=None):
        width = self.winfo_width() * (len(self.text)/self.label.winfo_width())

        if width > 0:
            wrapped_text = textwrap.fill(self.text, width=width)

            if len(wrapped_text) > len(self.text):
                # Truncate the text and add "..." at the end
                truncated_text = textwrap.shorten(wrapped_text, width - 3, placeholder="...")
                self.label.configure(text=truncated_text)
            else:
                self.label.configure(text=wrapped_text)
