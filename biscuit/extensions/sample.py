# sample extension

class Extension:
    def __init__(self, api):
        self.api = api

    def run(self):
        self.api.commands.register_command("Hello world", lambda: self.api.logger.log("Hello world"))
        self.api.commands.register_command("Hola!", lambda: self.api.notifications.show(f"Hola from {__name__}"))
        