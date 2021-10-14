class Binder:
    def __init__(self, base, *args, **kwargs):
        self.base = base
        self.root = self.base.root
        self.bindings = self.base.bindings

        self.bind_all()

    def bind_all(self):
        self.bind(self.bindings.new_file, self.base.newfile)
        self.bind(self.bindings.new_window, self.base.newwindow)
        self.bind(self.bindings.open_file, self.base.openfile)
        self.bind(self.bindings.open_dir, self.base.opendir)
        self.bind(self.bindings.save, self.base.save)
        self.bind(self.bindings.save_as, self.base.saveas)
        self.bind(self.bindings.close_file, self.base.closefile)
        self.bind(self.bindings.quit, self.base.exit)

    def bind(self, this, to_this):
        self.root.bind(this, to_this)
