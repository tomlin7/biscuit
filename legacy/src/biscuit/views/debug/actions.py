from __future__ import annotations

import tkinter as tk
import typing

from biscuit.common.icons import Icons
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
            Icons.DEBUG_PAUSE, self.toggle_pause, "#72bdff", icon2=Icons.DEBUG_CONTINUE
        )

        self.actions = {
            Icons.DEBUG_STEP_OVER: (self.step_over, "#72bdff"),
            Icons.DEBUG_STEP_INTO: (self.step_into, "#72bdff"),
            Icons.DEBUG_STEP_OUT: (self.step_out, "#72bdff"),
            Icons.DEBUG_RESTART: (self.restart, "#87d282"),
            Icons.DEBUG_STOP: (self.stop, "#f6876d"),
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
