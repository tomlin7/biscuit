from unittest.mock import MagicMock
from biscuit.language.manager import LanguageServerManager

class FakeDocumentSymbol:
    def __init__(self, name, start_line, children=None):
        self.name = name
        self.range = MagicMock()
        self.range.start = MagicMock()
        self.range.start.line = start_line
        self.range.start.character = 0
        self.children = children or []

def test_document_symbol_hierarchy():
    base = MagicMock()
    mgr = LanguageServerManager(base)
    
    child = FakeDocumentSymbol("inner_func", 10)
    parent = FakeDocumentSymbol("MyClass", 2, [child])
    
    mgr._update_symbols(None, [parent])
    base.settings.symbols_actionset.update.assert_called_once()
    symbols = base.settings.symbols_actionset.update.call_args[0][0]
    names = [s[0] for s in symbols]
    assert "MyClass" in names
    assert "inner_func" in names
