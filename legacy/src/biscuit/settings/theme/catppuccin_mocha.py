import sv_ttk

from .theme import *


class CatppuccinMocha(Theme):
    name = "Catppuccin Mocha"

    biscuit = "#f5e0dc"  # Original biscuit color from the Catppuccin Mocha palette
    biscuit_dark = "#cba6f7"  # A darker accent color closer to the theme

    border = "#313244"  # Darker border color to match the overall theme
    disabled = "#585b70"  # Correct shade for disabled elements

    primary_background = "#1e1e2e"  # This is correct (mantle in Catppuccin Mocha)
    primary_foreground = "#cdd6f4"  # This is correct (text color)
    primary_background_highlight = (
        "#313244"  # Slightly darker for highlighting background
    )
    primary_foreground_highlight = "#f5e0dc"  # Lighter highlight for readability

    secondary_background = "#181825"  # Slightly darker than primary background
    secondary_foreground = "#cdd6f4"  # This is correct
    secondary_background_highlight = "#313244"  # Matches the highlight from primary
    secondary_foreground_highlight = "#f5e0dc"  # Same as primary foreground highlight

    # Syntax highlighting
    Keyword = "#f5e0dc"  # Correct light pink for keywords
    Name = "#89b4fa"  # Correct blue for names
    Function = "#f9e2af"  # Correct yellow for function names
    String = "#a6e3a1"  # Green color for strings
    Number = "#fab387"
    Comment = {
        "foreground": "#6c7086",
        "font": {"slant": "italic"},
    }  # Gray for comments with italic style
    Punctuation = "#f5e0dc"

    def __init__(self, *args, **kwds) -> None:
        super().__init__(*args, **kwds)
        sv_ttk.use_dark_theme()

        self.editors.linenumbers.number.foreground = "#cdd6f4"
        self.editors.linenumbers.number.highlightforeground = "#cdd6f4"

        self.editors.linenumbers.breakpoint.background = "#f38ba8"
        self.editors.linenumbers.breakpoint.highlightbackground = "#f38ba8"
