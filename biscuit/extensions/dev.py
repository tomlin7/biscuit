# TEMPLATE FOR EXTENSION DEVELOPMENT

# Guide to Extension Development:
# 1. Create a new file in the `biscuit/extensions` folder
# 2. Name it something.py (e.g. hello_world.py)
# 3. Add following lines (for intellisense):

from __future__ import annotations

__version__ = '0.0.1'
__version_info__ = tuple([ int(num) for num in __version__.split('.')])

import typing

if typing.TYPE_CHECKING:
    from biscuit import ExtensionsAPI

# 4. Create a class named `Extension` as follows:

class Extension:
    """Dev Mode extension for Biscuit (author: @billyeatcookies)

    Contributes:
    - notifies user that dev mode is enabled
    """

    def __init__(self, api: ExtensionsAPI) -> None:
        self.api = api

    def run(self) -> None:
        self.api.notifications.info(f"Dev mode is enabled!")

# 5. Start customizing your extension!