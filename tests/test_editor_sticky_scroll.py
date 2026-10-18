from biscuit.editor.text.sticky_scroll import StickyScrollController, StickyHeaderScope

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
