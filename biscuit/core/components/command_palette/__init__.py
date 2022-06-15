from ..popup import PopupMenu


class CommandPalette(PopupMenu):
    def __init__(self, master, *args, **kwargs):
        self.items = [
            ("Editor Font Zoom In", lambda e=None: print("Test 1")), ("Editor Font Zoom Out", lambda e=None: print("Test 2")),
            ("Preferences: Color Theme", lambda e=None: print("Test 3")), ("Preferences: Open User Settings", lambda e=None: print("Test 4")),
            ("Toggle Word Wrap", lambda e=None: print("Test 4")), ("Toggle Terminal", lambda e=None: print("Test 4")),
            ("File: New File", lambda e=None: print("Test 4")), ("File: Open File", lambda e=None: print("Test 4"))]
        

        super().__init__(master, prompt=">", *args, **kwargs)
        self.base = master.base
