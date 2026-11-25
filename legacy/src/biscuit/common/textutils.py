import os

__all__ = [
    "get_eol",
    "get_eol_label",
    "get_default_newline",
    "is_text_file",
    "eol_map",
    "eol_map_rev",
]

eol_map = {
    "LF": "\n",
    "CRLF": "\r\n",
    "CR": "\r",
}
eol_map_rev = dict((v, k) for k, v in eol_map.items())


def get_eol(newline):
    """Get the EOL character for the given newline setting."""

    return eol_map.get(newline, os.linesep)


def get_eol_label(newline):
    """Get the label for the given newline setting."""

    return eol_map_rev.get(newline, "AUTO")


def get_default_newline():
    """Get the default newline setting."""

    return os.linesep


# CREDITS: https://eli.thegreenplace.net/2011/10/19/perls-guess-if-file-is-text-or-binary-implemented-in-python/
int2byte = lambda x: bytes((x,))
_text_characters = b"".join(int2byte(i) for i in range(32, 127)) + b"\n\r\t\f\b"


def is_text_file(path: str) -> bool:
    """Check if a file is a text file.

    Args:
        path (str): path to the file
    """

    fp = open(path, "rb")
    block = fp.read(512)
    fp.close()

    if b"\x00" in block:
        return False
    elif not block:
        return True

    nontext = block.translate(None, _text_characters)
    return float(len(nontext)) / len(block) <= 0.30
