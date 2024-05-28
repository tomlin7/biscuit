from __future__ import annotations

__version__ = '0.0.2'
__version_info__ = tuple([ int(num) for num in __version__.split('.')])

import subprocess as sp
import typing

if typing.TYPE_CHECKING:
    from biscuit import ExtensionsAPI


class Extension:
    """Isort extension for Biscuit (author: @billyeatcookies)
    
    Extension will automatically install isort if not installed.
    
    Contributes:
    - a command to reorder python imports in the active editor.
    """
    
    def __init__(self, api: ExtensionsAPI) -> None:
        self.api = api
        self.base = api.base

    def run(self) -> None:
        self.check_isort_installation()
        self.api.commands.register_command('Isort: Reorder imports in active editor ', self.format)
    
    def check_isort_installation(self):
        reqs = sp.check_output(['pip', 'freeze'])
        if not "isort".encode() in reqs:
            try:
                sp.check_call(['pip', 'install', 'isort'])
            except sp.CalledProcessError:
                self.api.notifications.warning("Python extension requires isort to be installed")

    def format(self, *_) -> str:
        editor = self.api.editorsmanager.active_editor
        if not (editor and editor.content and editor.content.editable):
            return
        
        text = editor.content.text
        if not text:
            return
        
        before = text.get_all_text()
        try:
            output = sp.check_output(['isort', '-'], input=before.encode(text.encoding))
            after = output.decode(text.encoding).replace('\r\n', '\n')
            if before != after:
                text.load_text(after)
        except sp.CalledProcessError as e:
            self.api.notifications.error(f"Isort: Failed to format file")
            self.api.logger.error(e)
            return
