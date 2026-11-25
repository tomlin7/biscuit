from biscuit.editor.text.changes import Change


class TestChange:
    def test_init(self):
        c = Change(
            start=[1, 0],
            old_end=[1, 5],
            new_end=[1, 3],
            old_text="hello",
            new_text="hi",
        )
        assert c.start == [1, 0]
        assert c.old_end == [1, 5]
        assert c.new_end == [1, 3]
        assert c.old_text == "hello"
        assert c.new_text == "hi"

    def test_update(self):
        c = Change(
            start=[1, 0],
            old_end=[1, 5],
            new_end=[1, 3],
            old_text="hello",
            new_text="hi",
        )
        c.update(
            start=[2, 0],
            old_end=[2, 10],
            new_end=[2, 8],
            old_text="old word",
            new_text="new word",
        )
        assert c.start == [2, 0]
        assert c.old_end == [2, 10]
        assert c.new_end == [2, 8]
        assert c.old_text == "old word"
        assert c.new_text == "new word"

    def test_dataclass_equality(self):
        c1 = Change(
            start=[1, 0],
            old_end=[1, 5],
            new_end=[1, 3],
            old_text="hello",
            new_text="hi",
        )
        c2 = Change(
            start=[1, 0],
            old_end=[1, 5],
            new_end=[1, 3],
            old_text="hello",
            new_text="hi",
        )
        assert c1 == c2

    def test_dataclass_repr(self):
        c = Change(
            start=[1, 0],
            old_end=[1, 5],
            new_end=[1, 3],
            old_text="hello",
            new_text="hi",
        )
        r = repr(c)
        assert "Change" in r
        assert "hello" in r
