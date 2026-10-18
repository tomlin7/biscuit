from unittest.mock import MagicMock
from biscuit.editor.autocomplete.item import CompletionItem

def test_completion_item_documentation():
    ci = MagicMock(spec=CompletionItem)
    ci.documentation = "Computes the square root of x."
    ci.detail = "sqrt(x: float) -> float"
    
    doc = CompletionItem.get_documentation_text(ci)
    assert doc == "Computes the square root of x."
