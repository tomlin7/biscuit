from types import SimpleNamespace

from biscuit.editor.text.text import Text


def test_set_line_byte_starts_handles_unicode():
    """Line start offsets use UTF-8 byte lengths, not character counts."""
    text = SimpleNamespace(_line_byte_starts=None)

    Text.set_line_byte_starts(text, "a\nbé\n")

    assert text._line_byte_starts == [0, 2, 6]


def test_line_byte_cache_stale():
    """The cache is stale only when it has not been built yet."""
    assert Text.line_byte_cache_stale(SimpleNamespace(_line_byte_starts=None))
    assert not Text.line_byte_cache_stale(SimpleNamespace(_line_byte_starts=[0]))


def test_insert_without_newline_shifts_following_lines():
    """Inserting within a line shifts all following line offsets."""
    text = SimpleNamespace(_line_byte_starts=[0, 2, 4, 6])

    Text._shift_line_byte_cache_for_insert(text, 0, 0, "x")

    assert text._line_byte_starts == [0, 3, 5, 7]


def test_insert_with_newline_adds_line_start():
    """Inserting text containing newlines adds new line start offsets."""
    text = SimpleNamespace(_line_byte_starts=[0, 2, 4])

    Text._shift_line_byte_cache_for_insert(text, 0, 1, "\nZ")

    assert text._line_byte_starts == [0, 2, 4, 6]


def test_delete_without_newline_shifts_following_lines():
    """Deleting within a line shifts all following line offsets back."""
    text = SimpleNamespace(_line_byte_starts=[0, 2, 4])

    Text._shift_line_byte_cache_for_delete(text, 0, 0, 1, 0)

    assert text._line_byte_starts == [0, 1, 3]


def test_multiline_delete_invalidates_cache():
    """Deleting across lines invalidates the cached offsets."""
    text = SimpleNamespace(_line_byte_starts=[0, 2, 4])

    Text._shift_line_byte_cache_for_delete(text, 0, 0, 3, 1)

    assert text._line_byte_starts is None
