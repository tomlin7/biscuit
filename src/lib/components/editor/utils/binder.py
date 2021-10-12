from lib.config.bindings import Bindings


class Binder:
    def __init__(self, master, bindings=None):
        self.base = master.base

        self.master = master
        self.bindings = bindings

        if bindings:
            self.bind_all()

    def bind(self, this, to_this):
        self.master.bind(this, to_this)
    
    def bind_all(self):
        self.master.text.bind("<Control-MouseWheel>", self.master.handle_zoom)
        self.master.text.bind("<<Change>>", self.master._on_change)
        self.master.text.bind("<Configure>", self.master._on_change)
