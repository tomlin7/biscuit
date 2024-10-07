from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from .terminalbase import TerminalBase


class AI:
    def __init__(self, terminal: TerminalBase) -> None:
        self.terminal = terminal
        self.base = terminal.base

        self.prompt = f"""You are an expert at terminal commands. you know all the commands
                and their arguments. You can generate correct commands with arguments from the command
                that was not recognized by the terminal. You can recognize and fix commands from any shell 
                in any operating system. Only return the fixed command, and dont explain it.

                The user may talk in english as well, its when he is not sure how to write the command.
                You can also generate commands for the user if he is not sure what to do!
                
                Shell executable used: {self.terminal.shell}
                Shell name: {self.terminal.name}
                System details: {str(self.base.system)}
                Input from user: """

        self.model = self.base.ai.get_model_instance(self.prompt)
        self.model.start_chat()

    def get_response(self, err_command: str) -> str:
        try:
            response = self.model.send_message(f"{self.prompt} {err_command}")
            if response:
                self.base.palette.show("runc:", response.strip())
        except Exception as e:
            self.base.logger.error(e)
            self.base.notifications.error(
                "Error occurred while fetching response. Please try again.",
                actions=[
                    (
                        "Configuration",
                        lambda: self.base.sidebar.show_ai().add_placeholder(),
                    )
                ],
            )
