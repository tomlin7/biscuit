from .. import PopupMenu


class CommandPalette(PopupMenu):
    """
    Command Palette

    Command palette is a popup menu for all configurable settings provided in the editor.
    """
    def __init__(self, root, *args, **kwargs):
        # items are only placeholders for now
        self.items = [
            ("Editor Font Zoom In", lambda e=None: print("Test 1")), ("Editor Font Zoom Out", lambda e=None: print("Test 2")),
            ("Preferences: Color Theme", lambda e=None: print("Test 3")), ("Preferences: Open User Settings", lambda e=None: print("Test 4")),
            ("Toggle Word Wrap", lambda e=None: print("Test 4")), ("Toggle Terminal", lambda e=None: print("Test 4")),
            ("File: New File", lambda e=None: print("Test 4")), ("File: Open File", lambda e=None: print("Test 4"))]
        
        super().__init__(root, prompt=">", *args, **kwargs)
        self.root = root
