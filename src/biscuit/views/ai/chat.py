from __future__ import annotations

import threading
import tkinter as tk
import typing
from tkinter.filedialog import askopenfilenames

from biscuit.common.chat import ChatModelInterface
from biscuit.common.icons import Icons
from biscuit.common.ui import Button, Entry, Frame, IconButton

from .attachments import Attachments
from .renderer import Renderer

if typing.TYPE_CHECKING:
    from .ai import AI


class Chat(Frame):
    """Chat view for the AI assistant.

    The Chat view is used to interact with the AI assistant.
    - The user can ask questions and get responses from the AI assistant.
    - The AI assistant is powered by the Google AI Studio API.
    - The user needs to enter the API key to start using the AI assistant.
    - The chat can be refreshed to start a new chat."""

    attachments: list[str] = []

    def __init__(self, master: AI, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master: AI = master

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        theme = self.base.theme

        self.model = None

        container = Frame(self)
        container.grid(column=0, row=0, sticky=tk.NSEW)

        self.renderer = Renderer(container)
        self.renderer.pack(fill=tk.BOTH, expand=True)
        self.renderer.write("Hello! I'm Bikkis, How can I help you today?", True)

        self.entrybox = Frame(self, bg=theme.border)
        self.entrybox.grid(column=0, row=1, sticky=tk.EW)

        self.attachbtn = IconButton(self.entrybox, icon=Icons.ATTACH, event=self.attach)
        self.attachbtn.config(
            fg=theme.secondary_foreground, bg=theme.secondary_background, padx=5
        )
        self.attachbtn.pack(fill=tk.Y, pady=(1, 0), side=tk.LEFT)

        self.entry = Entry(self.entrybox, "Ask me anything...")
        self.entry.config(bg=theme.secondary_background)
        self.entry.bind("<Return>", self.send)
        self.entry.pack(fill=tk.BOTH, expand=True, side=tk.LEFT, pady=(1, 0))

        self.sendbtn = IconButton(self.entrybox, icon=Icons.SEND, event=self.send)
        self.sendbtn.config(fg=theme.biscuit, bg=theme.secondary_background, padx=5)
        self.sendbtn.pack(fill=tk.Y, pady=(1, 0))

        self.attached_indicator = Button(
            self,
            text="0 files attached",
        )
        self.attached_indicator.config(
            bg=theme.biscuit,
            fg=theme.secondary_background,
            font=self.base.settings.uifont,
        )
        self.attachments_window = Attachments(self)
        self.attached_indicator.set_command(self.attachments_window.show)

    def set_model(self, model: ChatModelInterface) -> None:
        self.model = model
        self.model.start_chat()

    def attach(self, *_) -> None:
        self.attachments += list(
            askopenfilenames(initialdir=self.base.active_directory)
        )
        if self.attachments:
            self.show_attachments()
        else:
            self.clear_attachments()

    def refresh_attachments(self) -> None:
        if self.attachments:
            self.show_attachments()
        else:
            self.clear_attachments()

    def attach_file(self, *files: typing.List[str]) -> None:
        if files:
            self.attachments += files
            self.show_attachments()

    def show_attachments(self) -> None:
        self.attached_indicator.grid(column=0, row=2, sticky=tk.EW)
        self.attached_indicator.config(text=f"{len(self.attachments)} files attached")

    def clear_attachments(self) -> None:
        self.attachments = []
        self.attached_indicator.grid_forget()

    def generate_response(self, question: str) -> str:
        try:
            for file in self.attachments:
                with open(file, "rb") as f:
                    question += f"\n\nContents of {file}:\n{f.read().decode()}"

            response = self.model.send_message(question)
            self.renderer.write(response, True)

            self.clear_attachments()
        except Exception as e:
            # self.base.notifications.error("Bikkis: Invalid API Key")
            # self.master.add_placeholder()
            self.renderer.write("Something went wrong. Please try again later", True)
            self.base.logger.error(e)

    def send(self, *_):
        text = self.entry.get()
        self.renderer.write(
            f"<p><font color={self.base.theme.biscuit}> You: "
            + text
            + "</font><br></p>"
            # show attachments
            # + "".join(
            #     [
            #         f"<div><font color={self.base.theme.biscuit}> Attached: {file}</font><br></div>"
            #         for file in self.attachments
            #     ]
            # ),
        )
        self.entry.delete(0, tk.END)

        threading.Thread(
            target=self.generate_response, args=(text,), daemon=True
        ).start()

    def new_chat(self) -> None:
        self.model.start_chat()
        self.renderer.content = ""
        self.renderer.write("Hello! I'm Bikkis, How can I help you today?", True)
