from biscuit.common.icons import Icons
from biscuit.views.explorer.directorytree import get_file_icon


def test_get_file_icon():
    assert get_file_icon("main.py") == Icons.FILE_CODE
    assert get_file_icon("app.ts") == Icons.FILE_CODE
    assert get_file_icon("index.html") == Icons.FILE_CODE
    assert get_file_icon("data.json") == Icons.JSON
    assert get_file_icon("README.md") == Icons.MARKDOWN
    assert get_file_icon("logo.png") == Icons.FILE_MEDIA
    assert get_file_icon("manual.pdf") == Icons.FILE_PDF
    assert get_file_icon("archive.zip") == Icons.FILE_ZIP
    assert get_file_icon("binary.exe") == Icons.FILE_BINARY
    assert get_file_icon("unknown.xyz123") == Icons.FILE
