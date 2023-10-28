# sample extension

class Extension:
    def __init__(self, api) -> None:
        self.api = api

    def run(self) -> None:
        self.api.notifications.show(f"Welcome to Dev mode!")
        self.api.notifications.info(f"Dev mode is enabled!")
        self.api.notifications.warning(f"Dev mode is enabled!")
        self.api.notifications.error(f"Dev mode is enabled!")

