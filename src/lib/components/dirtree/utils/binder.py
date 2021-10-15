class Binder:
    def __init__(self, master):
        self.base = master.base
        self.master = master

        self.bind_all()
        
    def bind(self, this, to_this):
        self.master.bind(this, to_this)
    
    def bind_all(self):
        self.bind("<<TreeviewOpen>>", self.master.update_tree)
        self.bind("<<TreeviewSelect>>", self.master.update_tree)
        self.bind('<Double-Button-1>', self.master.openfile)
