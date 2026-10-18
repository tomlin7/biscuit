from unittest.mock import MagicMock
from biscuit.editor.breadcrumbs.breadcrumbs import BreadCrumbs

def test_breadcrumbs_symbol_hierarchy():
    bc = MagicMock(spec=BreadCrumbs)
    bc.symbol_buttons = []
    bc.master = MagicMock()

    symbols = [{"name": "MyClass"}, {"name": "my_method"}]
    BreadCrumbs.on_symbol_click(bc, symbols[0])
    bc.master.on_symbol_click.assert_called_with(symbols[0])
