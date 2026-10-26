from unittest.mock import MagicMock
from biscuit.editor.text.sticky_scroll import StickyScrollController, StickyHeaderScope, StickyScrollHeader
from biscuit.editor.text.text import Text

def test_sticky_scroll_controller():
    controller = StickyScrollController()
    controller.set_scopes([
        StickyHeaderScope(10, "class MyService:"),
        StickyHeaderScope(25, "    def handle_request(self):"),
        StickyHeaderScope(50, "    def cleanup(self):"),
    ])

    active = controller.get_active_headers(30)
    assert len(active) == 2
    assert active[0] == "class MyService:"
    assert "def handle_request" in active[1]

    active_early = controller.get_active_headers(5)
    assert len(active_early) == 0

def test_sticky_scroll_compute_scopes():
    controller = StickyScrollController()
    code = (
        "import os\n"
        "class App:\n"
        "    def run(self):\n"
        "        pass\n"
    )
    scopes = controller.compute_scopes_from_text(code)
    assert len(scopes) == 2
    assert scopes[0].line_number == 2
    assert "class App" in scopes[0].header_text
    assert scopes[1].line_number == 3
    assert "def run" in scopes[1].header_text

    active_scopes = controller.get_active_scopes(4)
    assert len(active_scopes) == 2
    assert active_scopes[0].header_text == "class App:"
    assert "def run" in active_scopes[1].header_text

def test_sticky_scroll_header():
    header = MagicMock(spec=StickyScrollHeader)
    header.controller = StickyScrollController()
    header.visible = False
    header.labels = []
    header.text = MagicMock(spec=Text)
    header.text.index.return_value = "10.0"

    header.controller.set_scopes([
        StickyHeaderScope(2, "class Server:"),
        StickyHeaderScope(5, "    def start(self):"),
    ])

    scopes = header.controller.get_active_scopes(10)
    assert len(scopes) == 2

    StickyScrollHeader.show(header)
    assert header.visible is True
    header.place.assert_called_with(in_=header.text, relx=0, rely=0, relwidth=1.0)

    StickyScrollHeader.hide(header)
    assert header.visible is False
    header.place_forget.assert_called()
