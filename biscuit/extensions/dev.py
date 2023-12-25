# sample extension

class Extension:
    def __init__(self, api) -> None:
        self.api = api

    def run(self) -> None:
        self.api.notifications.info(f"Dev mode is enabled!")
