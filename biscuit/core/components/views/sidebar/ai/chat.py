from __future__ import annotations

import threading
import tkinter as tk
import typing

import google.generativeai as ai

from biscuit.core.utils import Entry, Frame, IconButton, Text

if typing.TYPE_CHECKING:
    ...


class Chat(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        ai.configure(api_key=master.api_key)
        model = ai.GenerativeModel("gemini-pro")
        self.chat = model.start_chat()
        self.prompt = """You are an assistant part of Biscuit code editor named Bikkis. 
                You are an expert programmer, you'll help the user with his queries.
                
                Biscuit have many features like auto completions, git integration,
                code diagnostics, code refactoring, code navigation, advanced search, etc.
                It supports many languages like Python, JavaScript, Java, C++, etc.
                User can install extensions right within the editor's extension marketplace.

                You are created by master billiam. Give 'em minimal responses 
                and be straightforward. Reply to this message from user: """

        self.text = Text(self, font=("Segoe UI", 10), wrap=tk.WORD, relief=tk.FLAT,
                         highlightthickness=0, padx=10, pady=10, **self.base.theme.editors)
        self.text.pack(fill=tk.BOTH, expand=True)
        self.text.tag_config("user", foreground=self.base.theme.biscuit_dark)
        self.text.tag_config("bikkis", foreground=self.base.theme.biscuit)

        self.text.insert(tk.END, "✨ ", "bikkis")
        self.text.insert(tk.END, "Hello! I'm Bikkis, How can I help you today?\n\n")
        self.text.config(state=tk.DISABLED)

        container = Frame(self)
        container.pack(fill=tk.X)

        self.entry = Entry(container, "Ask me anything...")
        self.entry.bind("<Return>", self.send)
        self.entry.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)

        self.button = IconButton(container, icon="send", event=self.send)
        self.button.pack(fill=tk.Y, expand=True)

    def get_gemini_response(self, question: str, prompt: str) -> str:
        response = self.chat.send_message([prompt, question])
        self.text.insert(tk.END, "✨ ", "bikkis")
        self.text.insert(tk.END, response.text + "\n\n")
        self.text.config(state=tk.DISABLED)
        
    def send(self, *_):
        self.text.config(state=tk.NORMAL)

        text = self.entry.get()
        self.text.insert(tk.END, "You: " + text + "\n\n", "user")
        self.entry.delete(0, tk.END)
        
        threading.Thread(target=self.get_gemini_response, 
                         args=(text, self.prompt), daemon=True).start()
