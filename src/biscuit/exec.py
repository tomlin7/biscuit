from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from biscuit import App, BaseEditor

class ExecManager:
    def __init__(self, base: App):
        self.base = base
    
        self.commands = {'Python':'python'}

    def register_command(self, language: str, command: str) -> None:
        self.commands[language] = command

    def run_command(self, editor: BaseEditor, external=False) -> None:
        if external:
            self.base.terminalmanager.run_external_console(f"{editor.run_command_value} &")
            return
        
        self.base.terminalmanager.run_command(editor.run_command_value)
        self.base.terminalmanager.active_terminal.enter()

    def get_command(self, editor: BaseEditor) -> str:
        if c := self.commands.get(editor.language, None):
            return f"{c} {editor.path}"
        