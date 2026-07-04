import os
import pytest
from biscuit.common.fixedstack import FixedSizeStack

class MockMaster:
    def __init__(self):
        self.base = self
        self.opened_paths = []
        self.notifications = self
        self.errors = []

    def open(self, path):
        self.opened_paths.append(path)

    def error(self, msg):
        self.errors.append(msg)


def test_fixed_size_stack_capacity():
    master = MockMaster()
    stack = FixedSizeStack(master, "test_stack", capacity=3)
    
    assert stack.is_empty() is True
    assert len(stack) == 0

    stack.push("a")
    stack.push("b")
    stack.push("c")
    assert len(stack) == 3
    assert list(stack) == ["a", "b", "c"]

    # Exceed capacity, "a" should be removed
    stack.push("d")
    assert len(stack) == 3
    assert list(stack) == ["b", "c", "d"]


def test_fixed_size_stack_duplicate_behavior():
    master = MockMaster()
    stack = FixedSizeStack(master, "test_stack", capacity=3)

    stack.push("a")
    stack.push("b")
    # Pushing duplicate "a" should move it to the top/end of stack
    stack.push("a")
    assert len(stack) == 2
    assert list(stack) == ["b", "a"]


def test_fixed_size_stack_pop_and_clear():
    master = MockMaster()
    stack = FixedSizeStack(master, "test_stack", capacity=3)

    stack.push("x")
    stack.push("y")
    assert stack.pop() == "y"
    assert len(stack) == 1

    stack.clear()
    assert stack.is_empty() is True
    assert stack.pop() is None


def test_fixed_size_stack_dump_and_load():
    master = MockMaster()
    stack = FixedSizeStack(master, "test_stack", capacity=3)
    stack.push("a")
    stack.push("b")

    data = stack.dump()
    assert data == ["a", "b"]

    new_stack = FixedSizeStack(master, "another_stack")
    new_stack.load(["x", "y", "z"])
    assert list(new_stack) == ["x", "y", "z"]


def test_fixed_size_stack_open_item(tmp_path):
    master = MockMaster()
    stack = FixedSizeStack(master, "test_stack", capacity=3)

    # Path does not exist case
    non_existent = str(tmp_path / "ghost.txt")
    stack.push(non_existent)
    stack.open_item(non_existent)
    assert non_existent not in stack.stack
    assert len(master.errors) == 1

    # Path exists case
    real_file = tmp_path / "real.txt"
    real_file.write_text("content")
    real_path = str(real_file)

    stack.open_item(real_path)
    assert real_path in stack.stack
    assert real_path in master.opened_paths
