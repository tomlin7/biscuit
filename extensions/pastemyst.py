from __future__ import annotations

import webbrowser

__version__ = '0.0.1'
__version_info__ = tuple([ int(num) for num in __version__.split('.')])

import subprocess as sp
import typing

if typing.TYPE_CHECKING:
    from biscuit import ExtensionsAPI

class Extension:
    """PasteMyst extension for Biscuit (author: @billyeatcookies)

    Contributes:
    - `create paste` command to create a new paste on paste.myst.rs
    """

    def __init__(self, api: ExtensionsAPI) -> None:
        self.api = api

    def run(self) -> None:
        self.check_pastemyst_installation()
        self.api.commands.register_command('create paste', self.create_paste)
    
    def check_pastemyst_installation(self):
        reqs = sp.check_output(['pip', 'freeze'])
        if not "pastemyst".encode() in reqs:
            try:
                sp.check_call(['pip', 'install', 'pastemyst'])
            except sp.CalledProcessError:
                self.api.notifications.warning("PasteMyst extension requires pypi/pastemyst to be installed")

    def create_paste(self, *_) -> None:
        """Create a new paste on paste.myst.rs
        
        Returns:
        - str: The URL of the created paste
        """
        editor = self.api.editors.active_editor()
        if not editor or not editor.content or not editor.content.editable:
            return self.api.notifications.warning("Active editor is not text type.")
        
        try:
            from pastemyst import Client, Paste, Pasty
            paste = Paste(title=editor.filename,
                        pasties=[
                            Pasty(
                                title=editor.filename, 
                                code=editor.content.text.get_all_text())
                            ])
            client = Client()
            paste = client.create_paste(paste)
            webbrowser.open(paste.url)
            self.api.notifications.info(f"Paste created: {paste.url}")
        except Exception as e:
            self.api.notifications.error(f"Failed to create paste: {e}")
