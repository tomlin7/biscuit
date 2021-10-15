class Binder:
    def __init__(self, base, *args, **kwargs):
        self.base = base
        self.root = self.base.root
        self.bindings = self.base.bindings
        self.events = self.base.events

        self.bind_all()

    def bind_all(self):
        self.bind(self.bindings.new_file, self.events.newfile)
        self.bind(self.bindings.new_window, self.events.newwindow)
        self.bind(self.bindings.open_file, self.events.openfile)
        self.bind(self.bindings.open_dir, self.events.opendir)
        self.bind(self.bindings.save, self.events.save)
        self.bind(self.bindings.save_as, self.events.saveas)
        self.bind(self.bindings.close_file, self.events.closefile)
        self.bind(self.bindings.quit, self.events.quit)

    def bind(self, this, to_this):
        self.root.bind(this, to_this)
