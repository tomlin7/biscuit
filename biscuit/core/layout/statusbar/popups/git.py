from ....components.popup import PopupMenu


class GitPopup(PopupMenu):
    def __init__(self, master, *args, **kwargs):
        self.items = [
            ("master", lambda: self.select_branch("master")), 
            ("dev", lambda: self.select_branch("dev"))]
        
        super().__init__(master, *args, **kwargs)
        self.base = master.base
    
    def select_branch(self, language):
        pass