from ....components.popup import PopupMenu


class EncodingPopup(PopupMenu):
    def __init__(self, master, *args, **kwargs):
        self.items = [
            ("UTF-8 (Default)", lambda: self.select_encoding("UTF-8")), ("UTF-16 LE", lambda: self.select_encoding("UTF-16 LE")),
            ("UTF-16 BE", lambda: self.select_encoding("UTF-16 BE")), ("Western (Windows 1252)", lambda: self.select_encoding("Western (Windows 1252)")),
            ("Western (ISO 8859-1)", lambda: self.select_encoding("Western (ISO 8859-1)")), ("Western (ISO 8859-3)", lambda: self.select_encoding("Western (ISO 8859-3)"))]
        
        super().__init__(master, *args, **kwargs)
        self.base = master.base
    
    def select_encoding(self, encoding):
        pass