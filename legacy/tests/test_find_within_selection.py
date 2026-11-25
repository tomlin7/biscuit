from unittest.mock import MagicMock
from biscuit.editor.findreplace.find_replace import FindReplace

def test_find_within_selection_toggle():
    fr = MagicMock()
    fr.base.theme.biscuit = "#ff0000"
    fr.find_in_selection = False
    
    val = FindReplace.toggle_find_in_selection(fr)
    assert val is True
    assert fr.find_in_selection is True

    val2 = FindReplace.toggle_find_in_selection(fr)
    assert val2 is False
    assert fr.find_in_selection is False
