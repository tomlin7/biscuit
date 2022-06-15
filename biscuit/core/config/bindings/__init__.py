from .loadbindings import BindingsLoader


class Bindings:
    """
    Loads and manages bindings for biscuit.
    """

    # TODO: properties
    new_file: str
    new_window: str
    open_file: str
    open_dir: str
    save: str
    save_as: str
    close_file: str
    quit: str
    # ...

    def __init__(self, master):
        self.base = master.base

        self.loader = BindingsLoader(self)
        self.bindings = self.loader.get_loaded_bindings()
        self.map_bindings()

    def map_bindings(self):
        self.new_file = self.bindings['newFile']
        self.new_window = self.bindings['newWindow']
        self.open_file = self.bindings['openFile']
        self.open_dir = self.bindings['openDir']
        self.save = self.bindings['save']
        self.save_as = self.bindings['saveAs']
        self.close_file = self.bindings['closeFile']
        self.quit = self.bindings['quit']
