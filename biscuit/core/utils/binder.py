class Binder:
    def __init__(self, base, *args, **kwargs):
        self.base = base

        self.bindings = self.base.settings.bindings
        self.events = self.base.events

        self.bind_all()

    def bind_all(self):
        self.bind(self.bindings.new_file, self.events.new_file)
        self.bind(self.bindings.new_window, self.events.new_window)
        self.bind(self.bindings.open_file, self.events.open_file)
        self.bind(self.bindings.open_dir, self.events.open_directory)
        self.bind(self.bindings.save, self.events.save)
        self.bind(self.bindings.save_as, self.events.save_as)
        self.bind(self.bindings.close_file, self.events.close_file)
        self.bind(self.bindings.quit, self.events.quit)

    def late_bind_all(self):
        self.bind(self.bindings.commandpalette, lambda e: self.base.palette.show_prompt(">"))
        #self.bind(self.bindings.panel, self.base.root.baseframe.contentpane.toggle_panel)
        self.bind('<Configure>', self.base.on_gui_update)

    def bind(self, this, to_this):
        self.base.bind(this, to_this)
