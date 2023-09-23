# sample extension

class Extension:
    def __init__(self, api) -> None:
        self.api = api

    def run(self) -> None:
        self.api.notifications.show(f"Welcome to Dev mode!")
