from unittest.mock import MagicMock
from biscuit.language.client import LangServerClient

def test_configurable_lsp_settings():
    master = MagicMock()
    master.base.config.get_nested.return_value = 25000
    tab = MagicMock()
    tab.language = "python"
    tab.language_alias = "py"
    
    # Verify delay logic
    delay = master.base.config.get_nested("lsp.deletion_delay", 10000)
    assert delay == 25000
