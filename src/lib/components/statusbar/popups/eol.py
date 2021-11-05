from ...popup import PopupMenu


class EOLPopup(PopupMenu):
    def __init__(self, master):
        super().__init__()
        self.add_item("LF", self.on_eol_lf)
        self.add_item("CRLF", self.on_eol_crlf)
    
    def on_eol_crlf(self, *args):
        pass

    def on_eol_lf(self, *args):
        pass
