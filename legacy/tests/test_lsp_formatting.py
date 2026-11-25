from biscuit.language.formatter import DocumentFormatter

def test_document_formatter():
    fmt = DocumentFormatter(format_on_save=True)
    assert fmt.format_on_save is True
    res = fmt.apply_edits("a=1", [{"newText": "a = 1\n"}])
    assert res == "a = 1\n"
