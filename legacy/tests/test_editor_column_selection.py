from biscuit.editor.text.column_selection import ColumnSelection

def test_column_selection():
    sel = ColumnSelection(start_row=5, start_col=2, end_row=7, end_col=6)
    ranges = sel.get_line_ranges()
    assert len(ranges) == 3
    assert ranges[0] == ("5.2", "5.6")
    assert ranges[1] == ("6.2", "6.6")
    assert ranges[2] == ("7.2", "7.6")
