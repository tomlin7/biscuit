from unittest.mock import MagicMock
from biscuit.editor.hover.hover import Hover


def test_hover_calculate_size(mock_base):
    hover = Hover.__new__(Hover)
    hover.base = mock_base

    short_doc = "Short doc"
    w, h = hover.calculate_size(short_doc)
    assert 220 <= w <= 550
    assert 50 <= h <= 220

    long_doc = "A very long line that spans many many characters to test wider popup sizing\n" * 15
    w2, h2 = hover.calculate_size(long_doc)
    assert w2 > w
    assert h2 > h
