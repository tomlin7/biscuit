from .endpoint import Endpoint


class Theme(Endpoint):
    def __init__(self, *a) -> None:
        super().__init__(*a)

    def register_theme(self, name: str, theme) -> None:
        """Register a new theme class or instance."""
        self.base.settings.config.register_theme(name, theme)

    def set_theme(self, theme: str) -> None:
        """Set the active theme at runtime."""
        self.base.settings.config.set_theme(theme)

