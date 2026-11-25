from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from biscuit import App


class Endpoint:
    """Base endpoint class"""

    def __init__(self, base: App) -> None:
        self.base = base
