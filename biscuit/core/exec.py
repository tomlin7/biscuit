from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from core import App, BaseEditor

class ExecManager:
    def __init__(self, base: App):
        self.base = base
    
        self.commands = {'Python':'python'}

    def register_command(self, language: str, command: str) -> None:
        self.commands[language] = command

    def run_command(self, editor: BaseEditor) -> None:
        self.base.terminalmanager.run_command(editor.run_command)

    def get_command(self, editor: BaseEditor) -> str:
        if c := self.commands.get(editor.language, None):
            return f"{c} {editor.path}"
        