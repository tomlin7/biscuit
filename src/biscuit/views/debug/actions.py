from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common.ui import Frame, IconButton

if typing.TYPE_CHECKING:
    from .debug import Debug


class DebuggerActions(Frame):
    def __init__(self, debug: Debug):
        super().__init__(debug)
        self.debug = debug
        self.base = debug.base
        self.manager = debug.base.debugger_manager
        self.config(**self.base.theme.views.sidebar)

        self.pause_btn = self.add_button(
            "debug-pause", self.toggle_pause, "#72bdff", icon2="debug-continue"
        )

        self.actions = {
            "debug-step-over": (self.step_over, "#72bdff"),
            "debug-step-into": (self.step_into, "#72bdff"),
            "debug-step-out": (self.step_out, "#72bdff"),
            "debug-restart": (self.restart, "#87d282"),
            "debug-stop": (self.stop, "#f6876d"),
        }

        for icon, props in self.actions.items():
            action, color = props
            self.add_button(icon, action, color)

    def add_button(
        self, icon: str, action: typing.Callable, color: str, icon2: str = None
    ):
        button = IconButton(self, icon, action, icon2=icon2)
        button.config(fg=color, activeforeground=color)
        button.pack(side=tk.LEFT)
        return button

    def toggle_pause(self, *_):
        self.base.commands.debugger_toggle_pause()

    def step_over(self, *_):
        self.base.commands.debugger_step_over()

    def step_into(self, *_):
        self.base.commands.debugger_step_into()

    def step_out(self, *_):
        self.base.commands.debugger_step_out()

    def restart(self, *_):
        self.base.commands.debugger_restart()

    def stop(self, *_):
        self.base.commands.debugger_stop()
