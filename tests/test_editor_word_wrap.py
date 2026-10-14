from unittest.mock import MagicMock
from biscuit.editor.text.text import Text

def test_toggle_word_wrap():
    t = MagicMock(spec=Text)
    t.cget.return_value = "none"
    
    res = Text.toggle_word_wrap(t)
    assert res == "word"
    t.configure.assert_called_with(wrap="word")

    t.cget.return_value = "word"
    res2 = Text.toggle_word_wrap(t)
    assert res2 == "none"
    t.configure.assert_called_with(wrap="none")
