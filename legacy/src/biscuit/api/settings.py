from __future__ import annotations

import typing
from typing import Any

from .endpoint import Endpoint

if typing.TYPE_CHECKING:
    from biscuit import App


class Settings(Endpoint):
    """Settings endpoint for Extension API.

    Allows extensions to:
    - register new custom settings
    - retrieve configuration values
    - set configuration values
    - query registered settings
    """

    def __init__(self, base: App) -> None:
        super().__init__(base)
        self._custom_settings: dict[str, dict[str, Any]] = {}

    def get(self, key: str, default: Any = None) -> Any:
        """Retrieve a setting value from application config."""
        return self.base.settings.config.get_value(key, default)

    def set(self, key: str, value: Any) -> None:
        """Set a configuration value."""
        self.base.settings.config.data[key] = value

    def register_setting(
        self,
        name: str,
        type: str = "string",
        default: Any = None,
        description: str = "",
    ) -> None:
        """Register a new setting option for extensions.

        Args:
            name (str): The configuration key name.
            type (str): Type of setting ("string", "boolean", "integer", "number", "list").
            default (Any): Default value if not set.
            description (str): Human-readable explanation.
        """
        self._custom_settings[name] = {
            "name": name,
            "type": type,
            "default": default,
            "description": description,
        }
        if name not in self.base.settings.config.data and default is not None:
            self.base.settings.config.data[name] = default

    def get_registered_settings(self) -> dict[str, dict[str, Any]]:
        """Return all custom settings registered by extensions."""
        return self._custom_settings.copy()

    def get_all(self) -> dict[str, Any]:
        """Return all current config key-values."""
        return self.base.settings.config.data.copy()
