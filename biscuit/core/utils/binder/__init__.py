class Binder:
    def __init__(self, base, *args, **kwargs):
        self.base = base
        self.bindings = self.base.settings.bindings
        self.events = self.base.events

    def bind_all(self):
        self.bind(self.bindings.new_file, self.events.new_file)
        self.bind(self.bindings.new_window, self.events.new_window)
        self.bind(self.bindings.open_file, self.events.open_file)
        self.bind(self.bindings.open_dir, self.events.open_dir)
        self.bind(self.bindings.save, self.events.save)
        self.bind(self.bindings.save_as, self.events.save_as)
        self.bind(self.bindings.close_file, self.events.close_file)
        self.bind(self.bindings.quit, self.events.quit)

        self.bind('<Control-t>', self.base.toggle_terminal)
        self.bind('<Control-b>', self.base.toggle_active_side_pane)
        self.bind('<Control-l>', self.base.open_welcome_tab)

    def bind(self, this, to_this):
        self.base.root.bind(this, to_this)
