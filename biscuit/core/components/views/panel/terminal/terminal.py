import os
import tkinter as tk
from threading import Thread

if os.name == 'nt':
    from winpty import PtyProcess as PTY
else:
    from ptyprocess import PtyProcessUnicode as PTY

from biscuit.core.components.utils import Scrollbar

from ..panelview import PanelView
from .ansi import replace_newline, strip_ansi_escape_sequences
from .text import TerminalText


class Terminal(PanelView):
    """
    Base component for terminals, all terminals should inherit this class.

    args:
        shell - the shell executable
        cwd - current directory

    methods:
        start_service - start the terminal service
        destroy - kill the terminal service
        command - run custom commands
        enter - confirm a command at input
        write - write text to terminal
    """
    name: str
    icon: str
    shell: str
    p: PTY

    def __init__(self, master, cwd=".", *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__buttons__ = (('add',), ('trash', self.destroy))

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.alive = False
        self.cwd = cwd

        self.text = TerminalText(self, relief=tk.FLAT, padx=10, pady=10, font=("Consolas", 11))
        self.text.grid(row=0, column=0, sticky=tk.NSEW)
        self.text.bind("<Return>", self.enter)

        self.terminal_scrollbar = Scrollbar(self, style="EditorScrollbar")
        self.terminal_scrollbar.grid(row=0, column=1, sticky='NSW')

        self.text.config(yscrollcommand=self.terminal_scrollbar.set)
        self.terminal_scrollbar.config(command=self.text.yview, orient=tk.VERTICAL)

        self.text.tag_config("prompt", foreground=self.base.theme.biscuit_dark)
        self.text.tag_config("command", foreground=self.base.theme.biscuit)

        self.bind("<Destroy>", self.destroy)
    
    def start_service(self, *_) -> None:
        self.alive = True
        self.last_command = None
        
        self.p = PTY.spawn([self.shell])
        Thread(target=self.write_loop, daemon=True).start()

    def destroy(self, *_) -> None:
        self.alive = False

    def run_command(self, command: str) -> None:
        self.text.insert("end", command, "command")
        self.enter()

    def enter(self, *_) -> None:
        command = self.text.get('input', 'end')
        self.last_command = command
        self.text.register_history(command)
        if command.strip():
            self.text.delete('input', 'end')

        self.p.write(command + "\r\n")
        return "break"

    def write_loop(self) -> None:
        while self.alive:
            if buf := self.p.read():
                p = buf.find('\x1b]0;')
                
                if p != -1:
                    buf = buf[:p]
                buf = [strip_ansi_escape_sequences(i) for i in replace_newline(buf).splitlines()]
                self.insert('\n'.join(buf))
                
    def insert(self, output: str, tag='') -> None:
        self.text.insert(tk.END, output, tag)
        #self.terminal.tag_add("prompt", "insert linestart", "insert")
        self.text.see(tk.END)
        self.text.mark_set('input', 'insert')
    
    def newline(self):
        self.insert('\n')

    def clear(self) -> None:
        self.text.clear()

    def ctrl_key(self, key: str) -> None:
        if key == 'c':
            self.run_command('\x03')
            
    def __str__(self) -> str:
        return self.name