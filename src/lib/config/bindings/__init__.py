from lib.config.bindings.loadbindings import BindingsLoader


class Bindings:
    # TODO: properties
    new: str
    open: str
    save: str
    save_as: str
    close: str
    # ...

    def __init__(self):
        self.loader = BindingsLoader()
        self.bindings = self.loader.get_loaded_bindings()
        self.map_bindings()

    def map_bindings(self):
        self.new = self.bindings['new']
        self.open = self.bindings['open']
        self.save = self.bindings['save']
        self.save_as = self.bindings['saveAs']
        self.close = self.bindings['close']
