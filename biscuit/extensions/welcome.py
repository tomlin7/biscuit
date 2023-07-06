# sample extension

class Extension:
    def __init__(self, api):
        self.api = api
        self.api.notifications.show(f"Welcome to Biscuit")

    def run(self):
        ...
        