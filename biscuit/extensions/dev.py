# sample extension

class Extension:
    def __init__(self, api):
        self.api = api

    def run(self):
        self.api.notifications.show(f"Welcome to Dev mode!")
