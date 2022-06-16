from ....components.popup import PopupMenu


class EOLPopup(PopupMenu):
    def __init__(self, master, *args, **kwargs):
        self.items = [("LF", self.on_eol_crlf), ("CRLF", self.on_eol_lf)]
        
        super().__init__(master, *args, **kwargs)
        self.base = master.base
    
    def on_eol_crlf(self, *args):
        pass

    def on_eol_lf(self, *args):
        pass
