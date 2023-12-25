import queue
import subprocess
import tkinter as tk
from threading import Thread

from biscuit.core.components.utils import Scrollbar

from ..panelview import PanelView
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
        enter - flush terminal
        write - write text to terminal
    """
    name: str
    icon: str

    def __init__(self, master, cwd=".", *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__buttons__ = (('add',), ('trash', self.destroy))

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.alive = False
        self.cwd = cwd

        self.terminal = TerminalText(self, relief=tk.FLAT, padx=10, pady=10, font=("Consolas", 11))
        self.terminal.grid(row=0, column=0, sticky=tk.NSEW)
        self.terminal.bind("<Return>", self.enter)

        self.terminal_scrollbar = Scrollbar(self, style="EditorScrollbar")
        self.terminal_scrollbar.grid(row=0, column=1, sticky='NSW')

        self.terminal.config(yscrollcommand=self.terminal_scrollbar.set)
        self.terminal_scrollbar.config(command=self.terminal.yview, orient=tk.VERTICAL)

        self.terminal.tag_config("prompt", foreground=self.base.theme.biscuit_dark)
        self.terminal.tag_config("command", foreground=self.base.theme.biscuit)

    def start_service(self, *_) -> None:
        self.alive = True
        self.last_command = None

        self.p = subprocess.Popen(
            self.shell, stdout=subprocess.PIPE, cwd=self.cwd,
            stdin=subprocess.PIPE, stderr=subprocess.PIPE)

        self.out_queue = queue.Queue()
        self.err_queue = queue.Queue()

        self.t_out = t_out = Thread(target=self.process_out)
        self.t_err = t_err = Thread(target=self.process_err)
        t_out.daemon = True
        t_err.daemon = True
        t_out.start()
        t_err.start()

        self.show_prompt()
        self.write_loop()

        self.bind("<Destroy>", self.destroy)

    def show_prompt(self) -> None:
        if self.base.sysinfo.os == "Linux":
            self.write("->>", "prompt")

    def destroy(self, *_) -> None:
        self.alive = False
        self.p.kill()
        super().destroy()

    def run_command(self, command) -> None:
        self.write(command, "command")
        self.enter()

    def enter(self, *_) -> None:
        command = self.terminal.get('input', 'end')
        self.last_command = command
        self.terminal.register_history(command)

        self.p.stdin.write(command.encode())
        self.p.stdin.flush()

    def process_out(self) -> None:
        while self.alive:
            data = self.p.stdout.raw.read(1024)
            self.out_queue.put(data)

    def process_err(self) -> None:
        while self.alive:
            data = self.p.stderr.raw.read(1024)
            self.err_queue.put(data)

    def write_loop(self) -> None:
        """ write data from stdout and stderr to the Text widget"""
        if not self.err_queue.empty():
            self.write(self.err_queue.get())
            self.show_prompt()
        if not self.out_queue.empty():
            if self.last_command:
                self.write(self.out_queue.get()[len(self.last_command)-1:].rstrip())
                self.last_command = None
            else:
                self.write(self.out_queue.get())
            self.show_prompt()
        if self.alive:
            self.after(10, self.write_loop)

    def write(self, output, tag=None) -> None:
        self.terminal.insert(tk.END, output, tag)
        #self.terminal.tag_add("prompt", "insert linestart", "insert")
        self.terminal.see(tk.END)
        self.terminal.mark_set('input', 'insert')

    def clear(self) -> None:
        self.terminal.clear()
