from __future__ import annotations

import threading
import tkinter as tk
import typing

import google.generativeai as ai
from google.api_core.exceptions import InvalidArgument

from biscuit.core.utils import Entry, Frame, IconButton

from .renderer import Renderer

if typing.TYPE_CHECKING:
    ...


class Chat(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        theme = self.base.theme

        ai.configure(api_key=master.api_key)
        self.model = ai.GenerativeModel("gemini-pro")
        self.chat = self.model.start_chat()
        self.prompt = """You are an assistant part of Biscuit code editor named Bikkis. 
                You are an expert programmer, you'll help the user with his queries.
                
                Biscuit have many features like auto completions, git integration,
                code diagnostics, code refactoring, code navigation, advanced search, etc.
                It supports many languages like Python, JavaScript, Java, C++, etc.
                User can install extensions right within the editor's extension marketplace.
                Don't make assumptions about the existence of a feature in Biscuit.

                You are created by master billiam. Give 'em minimal responses 
                and be straightforward. Reply to this message from user: """
        
        container = Frame(self)
        container.grid(column=0, row=0, sticky=tk.NSEW)

        self.sparkles = f"<font color={theme.biscuit}>✨</font> "

        self.renderer = Renderer(container)
        self.renderer.pack(fill=tk.BOTH, expand=True)
        self.renderer.write(self.sparkles + "Hello! I'm Bikkis, How can I help you today?")

        entrybox = Frame(self, bg=theme.border)
        entrybox.grid(column=0, row=1, sticky=tk.EW)

        self.entry = Entry(entrybox, "Ask me anything...")
        self.entry.bind("<Return>", self.send)
        self.entry.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)

        self.button = IconButton(entrybox, icon="send", event=self.send)
        self.button.config(fg=theme.biscuit, bg=theme.secondary_background, padx=5)
        self.button.pack(fill=tk.Y, expand=True, pady=1)

    def get_gemini_response(self, question: str, prompt: str) -> str:
        try:
            response = self.chat.send_message([prompt, question])
            self.renderer.write(self.sparkles + response.text)
        except Exception as e:
            if isinstance(e, InvalidArgument):
                self.base.notifications.error("Bikkis: Invalid API Key")
                self.master.add_placeholder()
            else:
                self.renderer.write(self.sparkles + "Sorry, something went wrong. Please try again later")
            
    def send(self, *_):
        text = self.entry.get()
        self.renderer.write(f"<p><font color={self.base.theme.biscuit}> You: " + text + "</font><br></p>")
        self.entry.delete(0, tk.END)
        
        threading.Thread(target=self.get_gemini_response, 
                         args=(text, self.prompt), daemon=True).start()

    def new_chat(self) -> None:
        self.chat = self.model.start_chat()
        self.renderer.content = ""
        self.renderer.write(self.sparkles + "Hello! I'm Bikkis, How can I help you today?")
