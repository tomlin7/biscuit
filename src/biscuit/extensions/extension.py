from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from biscuit.api import ExtensionsAPI


class Extension:
    """Biscuit Extension base class.

    This class can be optionally inherited to create an extension."""

    def __init__(self, api: ExtensionsAPI) -> None:
        self.api = api

    def install(self) -> None:
        """Install the extension."""
        ...

    def uninstall(self) -> None:
        """Uninstall the extension."""
        ...


def setup(api: ExtensionsAPI) -> Extension:
    """Just for type hinting."""
    ...
