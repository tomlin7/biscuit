from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from .. import Settings


class Bindings:
    """Class for managing key bindings"""

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
        self.undo = "<Control-z>"
        self.redo = "<Control-y>"
        self.restore_closed_tab = "<Control-Shift-T>"
