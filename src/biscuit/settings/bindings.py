from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from .. import Settings

class Bindings:
    """
    Loads and manages bindings
    ...
    """
    def __init__(self, master: Settings) -> None:
        self.base = master.base

        self.new_file = "<Control-n>"
        self.new_window = "<Control-N>"
        self.open_file = "<Control-o>"
        self.open_dir = "<Control-O>"
        self.save = "<Control-s>"
        self.save_as = "<Control-S>"
        self.close_file = "<Control-w>"
        self.quit = "<Control-q>"
        self.commandpalette = "<Control-P>"
        self.filesearch = "<Control-p>"
        self.symbolpalette = "<Control-J>"
        self.panel = "<Control-grave>"
        self.undo="<Control-z>"
        self.redo="<Control-y>"

        # TODO loading bindings from user settings
        # self.loader = BindingsLoader(self)
        # self.bindings = self.loader.get_loaded_bindings()
        # self.map_bindings()

    def map_bindings(self) -> None:
        self.new_file = self.bindings['newFile']
        self.new_window = self.bindings['newWindow']
        self.open_file = self.bindings['openFile']
        self.open_dir = self.bindings['openDir']
        self.save = self.bindings['save']
        self.save_as = self.bindings['saveAs']
        self.close_file = self.bindings['closeFile']
        self.quit = self.bindings['quit']

        self.commandpalette = self.bindings['commandpalette']
        self.panel = "<Control-grave>"
