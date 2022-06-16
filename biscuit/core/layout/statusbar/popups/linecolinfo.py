from ....components.popup import PopupMenu


class LineColInfoPopup(PopupMenu):
    def __init__(self, master, *args, **kwargs):
        self.items = []
        
        super().__init__(master, *args, **kwargs)
        self.base = master.base
    
    def select_indentation(self, language):
        pass