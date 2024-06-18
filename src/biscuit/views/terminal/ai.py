from __future__ import annotations

import typing

import google.generativeai as ai
from google.generativeai.types import HarmBlockThreshold, HarmCategory

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

        self.model = ai.GenerativeModel(
            "gemini-1.5-flash",
            safety_settings={
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            },
        )
        self.chat = self.model.start_chat()

    def get_gemini_response(self, err_command: str) -> str:
        try:
            response = self.chat.send_message([self.prompt, err_command])
            if response and response.text:
                self.base.palette.show("runc:", response.text.strip())
        except Exception as e:
            self.base.logger.error(e)
            self.base.drawer.show_ai().add_placeholder()
