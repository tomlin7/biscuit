class ChatModelInterface:
    """Interface for chat models.

    Must implement the following methods:
        - start_chat
        - send_message
    """

    def __init__(self, api_key: str = "", prompt=""):
        self.api_key = api_key
        self.model = None
        self.chat = None
        self.prompt = prompt

    def set_api_key(self, api_key: str):
        self.api_key = api_key

    def set_prompt(self, prompt: str):
        self.prompt = prompt

    def start_chat(self): ...
    def send_message(self, message: str): ...
