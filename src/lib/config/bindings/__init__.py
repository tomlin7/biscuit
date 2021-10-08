from lib.config.bindings.loadbindings import BindingsLoader


class Bindings:
    # TODO: properties
    newfile: str
    newWindow: str
    openfile: str
    opendir: str
    save: str
    save_as: str
    closefile: str
    quit: str
    # ...

    def __init__(self):
        self.loader = BindingsLoader()
        self.bindings = self.loader.get_loaded_bindings()
        self.map_bindings()

    def map_bindings(self):
        self.newfile = self.bindings['newFile']
        self.newWindow = self.bindings['newWindow']
        self.openfile = self.bindings['openFile']
        self.opendir = self.bindings['openDir']
        self.save = self.bindings['save']
        self.save_as = self.bindings['saveAs']
        self.closefile = self.bindings['closeFile']
        self.quit = self.bindings['quit']
