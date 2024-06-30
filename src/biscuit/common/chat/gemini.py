import google.generativeai as ai
from google.generativeai.types import HarmBlockThreshold, HarmCategory

from .model import ChatModelInterface


class Gemini1p5Flash(ChatModelInterface):
    def __init__(self, api_key: str, prompt=""):
        super().__init__(api_key, prompt)
        self.initialize_model()

    def initialize_model(self):
        ai.configure(api_key=self.api_key)
        self.model = ai.GenerativeModel(
            "gemini-1.5-flash",
            safety_settings={
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            },
        )

    def set_api_key(self, api_key: str):
        self.api_key = api_key
        self.initialize_model()

    def set_prompt(self, prompt: str):
        self.prompt = prompt

    def start_chat(self):
        self.chat = self.model.start_chat()
        return self.chat

    def send_message(self, message: str):
        return self.chat.send_message([self.prompt, message]).text
