import os

__all__ = ['get_eol', 'get_eol_label', 'get_default_newline']

eol_map = {
    'LF': '\n',
    'CRLF': '\r\n',
    'CR': '\r',
}
eol_map_rev = dict((v, k) for k, v in eol_map.items())

def get_eol(newline):
    return eol_map.get(newline, os.linesep)

def get_eol_label(newline):
    return eol_map_rev.get(newline, 'AUTO')

def get_default_newline():
    return os.linesep

