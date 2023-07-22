import os

import toml


class BindingsLoader:
    """
    Loads bindings for biscuit from json file.
    """
    def __init__(self, master):
        self.base = master.base

        self.bindings_data = self.load_bindings()

    def load_bindings(self):
        with open(os.path.join(self.base.configdir, 'bindings.toml'), 'r') as bindings_file:
            bindings_data = toml.load(bindings_file)
        return bindings_data
    
    def get_loaded_bindings(self):
        return self.bindings_data
