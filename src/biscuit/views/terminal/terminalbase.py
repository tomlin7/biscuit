import os
import tkinter as tk
from threading import Thread

if os.name == "nt":
    from winpty import PtyProcess as PTY
else:
    from ptyprocess import PtyProcessUnicode as PTY

from biscuit.common.ui import Scrollbar

from ..panelview import PanelView
from .ai import AI
from .ansi import replace_newline, strip_ansi_escape_sequences
from .text import TerminalText


class TerminalBase(PanelView):
    """Base class for all terminals

    Attributes:
        name (str): The name of the terminal.
        icon (str): The icon of the terminal.
        shell (str): The shell to use.
        p (PTY): The PTY process.

    Methods:
        __init__: Initializes the terminal.
        start_service: Starts the terminal service.
        destroy: Destroys the terminal.
        run_command: Runs a command in the terminal.
        enter: Handles the enter key press.
        write_loop: Writes the terminal output.
        insert: Inserts text into the terminal.
        newline: Inserts a new line.
        clear: Clears the terminal.
        ctrl_key: Handles the ctrl key press.
        __str__: Returns the name of the terminal.
    """

    name: str
    icon: str
    shell: str
    p: PTY

    def __init__(self, master, cwd=".", *args, **kwargs) -> None:
        """Initialize the terminal

        Args:
            master: The parent widget
            cwd: The current working directory"""

        super().__init__(master, *args, **kwargs)
        self.__actions__ = (("add",), ("trash", self.destroy))

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.alive = False
        self.cwd = cwd
        self.last_command = ""
        self.last_command_index = ""
        # self.prediction = ""

        self.text = TerminalText(
            self, relief=tk.FLAT, padx=10, pady=10, font=("Consolas", 11)
        )
        self.text.grid(row=0, column=0, sticky=tk.NSEW)
        self.text.bind("<Return>", self.enter)

        self.terminal_scrollbar = Scrollbar(self, style="EditorScrollbar")
        self.terminal_scrollbar.grid(row=0, column=1, sticky="NSW")

        self.text.config(yscrollcommand=self.terminal_scrollbar.set)
        self.terminal_scrollbar.config(command=self.text.yview, orient=tk.VERTICAL)

        self.text.tag_config("prompt", foreground=self.base.theme.biscuit_dark)
        self.text.tag_config("command", foreground=self.base.theme.biscuit)
        self.text.tag_config("ghost", foreground=self.base.theme.border)

        self.ai = AI(self)

        self.bind("<Destroy>", self.destroy)
        # self.bind("<Tab>", self.tab_key)

    def start_service(self, *_) -> None:
        self.alive = True
        self.last_command = None

        self.p = PTY.spawn([self.shell], cwd=self.cwd)
        Thread(target=self.write_loop, daemon=True).start()

    def destroy(self, *_) -> None:
        self.alive = False

    def run_command(self, command: str) -> None:
        self.text.insert("end", command, "command")
        self.enter()

    def enter(self, *_) -> None:
        self.last_command_index = self.text.index("input")

        command = self.text.get("input", "end")
        self.last_command = command
        self.text.register_history(command)
        if command.strip():
            self.text.delete("input", "end")
            self.text.tag_add("prompt", "input linestart", "input")

        self.p.write(command + "\r\n")
        return "break"

    def write_loop(self) -> None:
        while self.alive:
            if buf := self.p.read():
                p = buf.find("\x1b]0;")

                if p != -1:
                    buf = buf[:p]
                buf = [
                    strip_ansi_escape_sequences(i)
                    for i in replace_newline(buf).splitlines()
                ]
                buf = "\n".join(buf)

                self.insert(buf)
                if "is not recognized as an internal or external command" in buf:
                    self.error()

    def error(self):
        if not self.base.ai.api_key:
            self.base.drawer.show_ai().add_placeholder()

        self.ai.get_gemini_response(self.last_command)

    def insert(self, output: str, tag="") -> None:
        self.text.insert(tk.END, output, tag)
        # self.terminal.tag_add("prompt", "insert linestart", "insert")
        self.text.see(tk.END)
        self.text.mark_set("input", "insert")

    def newline(self):
        self.insert("\n")

    def clear(self) -> None:
        self.text.clear()

    # def ghost_insert(self, output: str) -> None:
    #     self.text.insert(tk.END, output, "ghost")
    #     self.text.see(tk.END)
    #     self.prediction = output

    # def tab_key(self, *_) -> None:
    #     if t := self.text.get("input", "insert"):
    #         if t.strip() in self.prediction.strip():
    #             self.text.delete("input", "end")
    #             self.text.insert("end", self.prediction)
    #     else:
    #         self.text.insert("end", "    ")

    def ctrl_key(self, key: str) -> None:
        if key == "c":
            self.run_command("\x03")

    def __str__(self) -> str:
        return self.name
