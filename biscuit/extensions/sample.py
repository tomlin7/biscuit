# sample extension

class Extension:
    def __init__(self, api):
        self.api = api

    def run(self):
        self.api.commands.register_command("Hello world", lambda: print("Hello world"))
        