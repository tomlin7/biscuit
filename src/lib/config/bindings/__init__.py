from lib.config.bindings.loadbindings import BindingsLoader


class Bindings:
    # TODO: properties
    # ...

    def __init__(self):
        self.loader = BindingsLoader()
        self.bindings = self.loader.get_loaded_bindings()