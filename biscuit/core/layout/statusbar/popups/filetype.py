from ....components.palette import PopupMenu


class FileTypePopup(PopupMenu):
    def __init__(self, master, *args, **kwargs):
        items = [
            ("Plain Text", lambda: self.select_language("plaintext")), 
            ("Python", lambda: self.select_language("python"))]
        
        super().__init__(master, items, *args, **kwargs)
        self.base = master.base
    
    def select_language(self, language):
        pass