import tkinter as tk

from biscuit.api import notifications
from biscuit.common.icons import Icons
from biscuit.common.menu import Dropdown

from ..sidebar_view import SideBarView
from .actions import DebuggerActions
from .callstack import CallStack
from .placeholder import DebugPlaceholder
from .variables import Variables

EMPTY_MESSAGE = "No configurations found"


class Debug(SideBarView):
    """A view that displays the debugger variables and call stack.

    - Each editor can have its own debugger.
    - If the editor has a debugger, the debug view will show the variables and call stack of the debugger.
    - Debugger run controls are displayed in the editor toolbar."""

    def __init__(self, master, *args, **kwargs) -> None:
        self.__actions__ = []
        super().__init__(master, *args, **kwargs)
        self.__icon__ = Icons.DEBUG_ALT
        self.name = "Debug"
        self.running = False
        self.manager = self.base.debugger_manager

        self.dropdown = Dropdown(
            self.top,
            icon=Icons.PLAY,
            callback=self.set_config,
            iconfg="#87d282",
            iconhfg="#87d282",
            empty_message=EMPTY_MESSAGE,
        )
        self.dropdown.icon_label.bind("<Button-1>", self.run_config)
        self.top.grid_columnconfigure(self.column, weight=1)
        self.dropdown.grid(row=0, column=self.column, sticky=tk.NSEW, padx=(0, 10))
        self.column += 1

        self.configs = {}
        self.selected_config = ""
        self.refresh_configs()

        self.actionbar = DebuggerActions(self)
        self.variables = Variables(self)
        self.callstack = CallStack(self)

        self.placeholder = DebugPlaceholder(self)
        self.add_item(self.placeholder)

    def refresh_configs(self):
        self.configs = {
            config["name"]: config for config in self.manager.config_loader.configs
        }
        self.selected_config = list(self.configs.keys())[0] if self.configs else None
        self.dropdown.set_items([config for config in self.configs.keys()])
        self.dropdown.change_text(self.selected_config)

    def set_config(self, name: str):
        self.selected_config = name
        self.run_config()

    def run_config(self, *_):
        if not self.selected_config or self.selected_config == EMPTY_MESSAGE:
            self.base.notifications.error(
                "You need to create a launch configuration to run the debugger.",
                actions=[["Configure launch...", self.open_config_editor]],
            )
            return

        try:
            if self.selected_config:
                config = self.configs[self.selected_config]
                language = config["language"]
                if debugger := self.manager.request_debugger(config["language"]):
                    debugger.launch_config(config)
                else:
                    self.base.notifications.error(
                        f"Debugger for {language} not found.",
                        actions=[
                            ["Configure launch...", self.open_config_editor],
                            ["Search Extensions", self.base.sidebar.show_extensions],
                        ],
                    )
        except Exception as e:
            self.base.notifications.error(
                f"Launch configuration {self.selected_config} failed.",
                actions=[
                    ["Configure launch...", self.open_config_editor],
                    ["Logs", self.base.panel.show_logs],
                ],
            )
            self.base.logger.error(
                f"Launch configuration {self.selected_config} failed: {e}"
            )

    def open_config_editor(self, *_):
        path = (
            self.manager.config_loader.path
            if self.base.active_directory
            else ".biscuit/launch.toml"
        )
        self.base.open_editor(path)

    def refresh(self):
        if self.manager.config_loader.config_found or self.running:
            self.show()
        else:
            self.hide()

        self.refresh_configs()

    def set_running(self):
        self.running = True
        self.add_item(
            self.actionbar, fill=tk.Y, anchor=tk.CENTER, before=self.variables
        )

    def set_stopped(self):
        self.running = False
        self.actionbar.pack_forget()

    def set_paused(self):
        self.actionbar.pause_btn.toggle_icon()

    def reset(self):
        self.actionbar.pause_btn.reset_icon()
        self.variables.clear()
        self.callstack.clear()

    def show(self):
        self.placeholder.pack_forget()
        self.add_item(self.variables)
        self.add_item(self.callstack)

    def hide(self):
        self.actionbar.pack_forget()
        self.variables.pack_forget()
        self.callstack.pack_forget()
        self.add_item(self.placeholder)
