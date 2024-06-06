"""ANSI escape sequence utilities."""

import re

SEQ = re.compile(r"\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
NEWLINE = re.compile(r"\x1b\[\d+\;1H")


def strip_ansi_escape_sequences(string):
    return SEQ.sub("", string)


def replace_newline(string):
    return NEWLINE.sub("\n", string)
