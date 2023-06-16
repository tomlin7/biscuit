from core.config.languages import CPP

class Syntax:
    def __init__(self, master):
        self.master = master
        self.keywords = []

    def get_autocomplete_list(self):
        return [] # (i, "keyword") for i in self.keywords]
