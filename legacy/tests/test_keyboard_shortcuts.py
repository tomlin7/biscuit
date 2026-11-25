import tkinter as tk
from unittest.mock import MagicMock

from biscuit.layout.menubar.item import MenubarItem
from biscuit.layout.menubar.menubar import Menubar


def test_menubar_item_underline(mock_base):
    container = MagicMock()
    container.base = mock_base
    item = MenubarItem.__new__(MenubarItem)
    item.base = mock_base
    item.master = container
    item.name = "File"
    item.underline = 0
    assert item.underline == 0


def test_menubar_bind_accelerators(mock_base):
    mb = Menubar.__new__(Menubar)
    mb.base = mock_base
    item_f = MagicMock()
    item_f.name = "File"
    item_e = MagicMock()
    item_e.name = "Edit"
    mb.menus = [item_f, item_e]

    mb.bind_accelerators()
    # Check that bind was called for alt shortcuts on base
    bound_events = [call[0][0] for call in mock_base.bind.call_args_list]
    assert "<Alt-f>" in bound_events
    assert "<Alt-F>" in bound_events
    assert "<Alt-e>" in bound_events
    assert "<Alt-E>" in bound_events
