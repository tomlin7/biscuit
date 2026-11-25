from unittest.mock import MagicMock
from biscuit.views.search.search import Search

def test_search_exclude_box():
    s = MagicMock()
    s.exclude_box = MagicMock()
    s.exclude_box.get.return_value = "*.log, node_modules"
    
    excludes = [e.strip() for e in s.exclude_box.get().split(",") if e.strip()]
    assert len(excludes) == 2
    assert "*.log" in excludes
    assert "node_modules" in excludes
