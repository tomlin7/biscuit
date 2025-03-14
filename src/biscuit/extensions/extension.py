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


# Placeholder for type hinting.
# `setup` is the entry point for the extension.
def setup(api: ExtensionsAPI):
    """Defines the entrypoint to the extension.

    NOTE: `setup(api)` must be present in `src/extension_name/__init__.py`

    Normally, `api.register(id, instance)` is called within `setup`
    if you are expecting it to communicate with other loaded extensions."""
    ...
