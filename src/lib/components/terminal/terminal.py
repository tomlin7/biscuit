from .base import TerminalBase


class Terminal(TerminalBase):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.base = master.base
        
        self.configure(pady=5, padx=5, font=('Consolas', 15))
        self.shell = True