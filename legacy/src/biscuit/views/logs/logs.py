import queue
import tkinter as tk
from datetime import datetime

from biscuit.common import caller_class_name
from biscuit.common.icons import Icons
from biscuit.common.ui import Scrollbar

from ..panelview import PanelView


class Logs(PanelView):
    """The Logs view.

    The Logs view displays the logs of the application.
    - Show info, warning, error, trace logs.
    - Clear all logs.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.__actions__ = ((Icons.CLEAR_ALL, self.clear_all),)

        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

        self.queue = queue.Queue()

        self.text = tk.Text(
            self,
            relief=tk.FLAT,
            padx=10,
            pady=10,
            font=("Consolas", 11),
            **self.base.theme.editors.text,
        )
        self.text.grid(row=0, column=0, sticky=tk.NSEW)

        self.scrollbar = Scrollbar(self, style="EditorScrollbar")
        self.scrollbar.grid(sticky=tk.NSEW, row=0, column=1)

        self.text.config(yscrollcommand=self.scrollbar.set)
        self.scrollbar.config(command=self.text.yview)

        fontbold = ("Consolas", 11, "bold")

        self.text.tag_config("time", foreground=self.base.theme.views.panel.logs.time)
        self.text.tag_config(
            "caller", foreground=self.base.theme.views.panel.logs.caller
        )

        self.text.tag_config("info", foreground=self.base.theme.views.panel.logs.info)
        self.text.tag_config(
            "warning", foreground=self.base.theme.views.panel.logs.warning
        )
        self.text.tag_config(
            "error", foreground=self.base.theme.views.panel.logs.error, font=fontbold
        )
        self.text.tag_config("trace", foreground=self.base.theme.border)

        self.gui_refresh_loop()

    def gui_refresh_loop(self) -> None:
        if not self.queue.empty():
            self.write(*self.queue.get())

        self.after(10, self.gui_refresh_loop)

    def write(self, *args) -> None:
        self.text.config(state=tk.NORMAL)
        for i in args:
            if isinstance(i, tuple):
                self.text.insert(tk.END, i[0], i[1])
            else:
                self.text.insert(tk.END, i)
        self.text.config(state=tk.DISABLED)
        self.text.see(tk.END)

    def newline(self) -> None:
        self.queue.put(("\n",))

    def log(self, type: str, caller: str, text: str) -> None:
        self.queue.put(
            (
                "[",
                (datetime.now().strftime("%H:%M:%S:%f"), "time"),
                "]",
                type,
                "[",
                (caller, "caller"),
                f"]: {text}",
            )
        )
        self.newline()

    def info(self, text: str) -> None:
        """info level log"""

        self._std_log(" [info] ", "info", text)

    def warning(self, text: str) -> None:
        """warning level log"""

        self._std_log(" [warning] ", "warning", text)

    def error(self, text: str) -> None:
        """error level log"""

        self._std_log(" [error] ", "error", text)

    def trace(self, text: str) -> None:
        """trace level log"""

        # traces are fully greyed out
        self.queue.put(
            (
                (
                    f"[{datetime.now().strftime('%H:%M:%S:%f')}] [trace] [{caller_class_name(skip=3)}]: {text}",
                    "trace",
                ),
                "\n",
            )
        )

    def _std_log(self, kindtext: str, kind: str, text: str) -> None:
        self.log((kindtext, kind), caller_class_name(skip=3), text)

    def rawlog(self, text: str, kind: int):
        match kind:
            case 1:
                self.error(text)
            case 2:
                self.warning(text)
            case 3:
                self.info(text)
            case _:
                self.trace(text)

    def clear_all(self, *_) -> None:
        self.text.config(state=tk.NORMAL)
        self.text.delete(1.0, tk.END)
        self.text.config(state=tk.DISABLED)
