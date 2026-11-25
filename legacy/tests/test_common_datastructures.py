import pytest
from biscuit.common.textindex import TextIndex
from biscuit.common.minclosestdict import MinClosestKeyDict
from biscuit.common.actionset import ActionSet
from biscuit.common.fixedstack import FixedSizeStack


class TestTextIndex:
    def test_parse(self):
        ti = TextIndex("3.14")
        assert ti.line == 3
        assert ti.column == 14

    def test_str(self):
        assert str(TextIndex("1.5")) == "1.5"

    def test_repr(self):
        assert repr(TextIndex("2.0")) == "2.0"

    def test_eq(self):
        assert TextIndex("1.1") == TextIndex("1.1")
        assert TextIndex("1.1") != TextIndex("1.2")

    def test_lt(self):
        assert TextIndex("1.1") < TextIndex("1.2")
        assert TextIndex("1.5") < TextIndex("2.0")
        assert not TextIndex("2.0") < TextIndex("1.5")

    def test_le(self):
        assert TextIndex("1.1") <= TextIndex("1.1")
        assert TextIndex("1.1") <= TextIndex("1.2")

    def test_gt(self):
        assert TextIndex("2.0") > TextIndex("1.5")
        assert not TextIndex("1.1") > TextIndex("1.2")

    def test_ge(self):
        assert TextIndex("2.0") >= TextIndex("2.0")
        assert TextIndex("2.0") >= TextIndex("1.5")

    def test_hash(self):
        s = {TextIndex("1.1"), TextIndex("1.1"), TextIndex("2.0")}
        assert len(s) == 2

    def test_invalid_format(self):
        with pytest.raises(ValueError):
            TextIndex("invalid")


class TestMinClosestKeyDict:
    def test_set_get_exact(self):
        d = MinClosestKeyDict()
        d["1.0"] = "foo"
        d["5.3"] = "bar"
        val, key = d["1.0"]
        assert val == "foo"
        assert key == TextIndex("1.0")

    def test_closest_key_less(self):
        d = MinClosestKeyDict()
        d["5.0"] = "value5"
        d["10.0"] = "value10"
        val, key = d["7.0"]
        assert val == "value5"
        assert key == TextIndex("5.0")

    def test_keyerror_when_no_less_key(self):
        d = MinClosestKeyDict()
        d["5.0"] = "value5"
        with pytest.raises(KeyError):
            d["1.0"]

    def test_empty_dict_keyerror(self):
        d = MinClosestKeyDict()
        with pytest.raises(KeyError):
            d["1.0"]

    def test_sorted_order(self):
        d = MinClosestKeyDict()
        d["10.0"] = "ten"
        d["1.0"] = "one"
        d["5.0"] = "five"
        keys = list(d.keys())
        assert keys == [TextIndex("1.0"), TextIndex("5.0"), TextIndex("10.0")]

    def test_get_closest_with_multiple_entries(self):
        d = MinClosestKeyDict()
        d["2.0"] = "a"
        d["4.0"] = "b"
        d["6.0"] = "c"
        val, key = d["5.0"]
        assert val == "b"
        assert key == TextIndex("4.0")

    def test_update_existing(self):
        d = MinClosestKeyDict()
        d["1.0"] = "old"
        d["1.0"] = "new"
        val, _ = d["1.0"]
        assert val == "new"


class TestActionSet:
    def test_init(self):
        a = ActionSet("Test", ">")
        assert a.description == "Test"
        assert a.prefix == ">"
        assert list(a) == []

    def test_init_with_items(self):
        items = [("cmd1", lambda: None), ("cmd2", lambda: None)]
        a = ActionSet("Test", ">", items=items)
        assert len(a) == 2

    def test_repr(self):
        a = ActionSet("Description", ">")
        assert repr(a) == "Description"

    def test_add_action(self):
        a = ActionSet("Test", ">")
        fn = lambda: None
        a.add_action("command", fn)
        assert ("command", fn) in a

    def test_add_pinned_actions(self):
        a = ActionSet("Test", ">")
        fn = lambda s: None
        a.add_pinned_actions("search {}", fn)
        assert len(a.pinned) == 1
        assert a.pinned[0] == ("search {}", fn)

    def test_get_pinned(self):
        a = ActionSet("Test", ">")
        fn = lambda s: None
        a.add_pinned_actions("search {}", lambda s: None)
        result = a.get_pinned("hello")
        assert "hello" in result[0][0]

    def test_get_pinned_with_none_term(self):
        a = ActionSet("Test", ">")
        a.add_pinned_actions("search {}", lambda s: None)
        result = a.get_pinned(None)
        assert "..." in result[0][0]

    def test_update(self):
        a = ActionSet("Test", ">")
        items = [("new1", lambda: None)]
        a.update(items)
        assert len(a) == 1
        assert a[0][0] == "new1"

    def test_update_clears_old(self):
        a = ActionSet("Test", ">", items=[("old", lambda: None)])
        a.update([("new", lambda: None)])
        assert len(a) == 1
        assert a[0][0] == "new"


class TestFixedSizeStack:
    @pytest.fixture
    def stack(self, mock_base):
        s = FixedSizeStack.__new__(FixedSizeStack)
        s.base = mock_base
        s.name = "test"
        s.capacity = 3
        s.stack = []
        return s

    def test_push(self, stack):
        stack.push("a")
        assert stack.stack == ["a"]

    def test_push_removes_oldest_when_full(self, stack):
        stack.push("a")
        stack.push("b")
        stack.push("c")
        stack.push("d")
        assert stack.stack == ["b", "c", "d"]

    def test_push_moves_existing_to_top(self, stack):
        stack.push("a")
        stack.push("b")
        stack.push("c")
        stack.push("b")
        assert stack.stack == ["c", "b"]

    def test_pop(self, stack):
        stack.push("a")
        stack.push("b")
        assert stack.pop() == "b"
        assert stack.stack == ["a"]

    def test_pop_empty(self, stack):
        assert stack.pop() is None

    def test_is_empty(self, stack):
        assert stack.is_empty()
        stack.push("a")
        assert not stack.is_empty()

    def test_len(self, stack):
        assert len(stack) == 0
        stack.push("a")
        assert len(stack) == 1

    def test_clear(self, stack):
        stack.push("a")
        stack.push("b")
        stack.clear()
        assert len(stack) == 0

    def test_iter(self, stack):
        stack.push("a")
        stack.push("b")
        assert list(iter(stack)) == ["a", "b"]

    def test_dump(self, stack):
        stack.push("x")
        stack.push("y")
        assert stack.dump() == ["x", "y"]

    def test_load(self, stack):
        stack.load(["p", "q"])
        assert stack.stack == ["p", "q"]
        assert isinstance(stack.load(["a"]), FixedSizeStack)

    def test_list(self, stack):
        stack.push("a")
        stack.push("b")
        result = stack.list
        assert result[0][0] == "b"
        assert callable(result[0][1])

    def test_open_item_nonexistent(self, stack):
        stack.push("nonexistent_path_xyz")
        stack.open_item("nonexistent_path_xyz")
        assert "nonexistent_path_xyz" not in stack.stack
