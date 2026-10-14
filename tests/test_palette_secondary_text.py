from unittest.mock import MagicMock
from biscuit.common.palette.item import PaletteItem

def test_palette_item_secondary_and_shortcut():
    item = MagicMock()
    item.text = "File: Open File"
    item.description = "Open existing file from disk"
    item.shortcut = "Ctrl+O"

    display = PaletteItem.get_full_display_text(item)
    assert "File: Open File" in display
    assert "Open existing file from disk" in display
    assert "[Ctrl+O]" in display
