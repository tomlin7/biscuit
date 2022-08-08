from ....components.popup import PopupMenu


class LineColInfoPopup(PopupMenu):
    def __init__(self, master, *args, **kwargs):
        items = []
        
        super().__init__(master, items, *args, **kwargs)
        self.base = master.base
    
    def select_indentation(self, language):
        pass