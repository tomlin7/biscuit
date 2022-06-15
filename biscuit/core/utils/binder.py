class Binder:
    def __init__(self, master, *args, **kwargs):
        self.master = master
        self.base = master.base

        self.root = self.base.root
        self.bindings = self.base.bindings
        self.events = self.base.events

        self.bind_all()

    def bind_all(self):
        self.bind(self.bindings.new_file, self.events.new_file)
        self.bind(self.bindings.new_window, self.events.new_window)
        self.bind(self.bindings.open_file, self.events.open_file)
        self.bind(self.bindings.open_dir, self.events.open_dir)
        self.bind(self.bindings.save, self.events.save)
        self.bind(self.bindings.save_as, self.events.save_as)
        self.bind(self.bindings.close_file, self.events.close_file)
        self.bind(self.bindings.quit, self.events.quit)

    def bind(self, this, to_this):
        self.root.bind(this, to_this)
