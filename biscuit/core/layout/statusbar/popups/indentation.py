from ....components.popup import PopupMenu


class IndentationPopup(PopupMenu):
    def __init__(self, master, *args, **kwargs):
        items = [
            ("4", lambda: self.select_indentation("4")), 
            ("2", lambda: self.select_indentation("2"))]
        
        super().__init__(master, items, *args, **kwargs)
        self.base = master.base
    
    def select_indentation(self, language):
        pass