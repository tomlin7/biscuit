from ..popup import PopupMenu


class CommandPalette(PopupMenu):
    def __init__(self, master, *args, **kwargs):
        self.items = [
            ("Test 1", lambda e=None: print("Test 1")), ("Test 2", lambda e=None: print("Test 2")),
            ("Test 3", lambda e=None: print("Test 3")), ("Test 4", lambda e=None: print("Test 4"))]

        super().__init__(master, *args, **kwargs)
        self.base = master.base
