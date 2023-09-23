#TODO LSP implementation

class Syntax:
    def __init__(self, master) -> None:
        self.master = master
        self.keywords = []

    def get_autocomplete_list(self):
        return []
