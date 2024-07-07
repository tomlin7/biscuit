"""Utility functions for the Python debugger."""

import os
import sys
import types
import typing


def get_callstack(
    frame: types.FrameType,
) -> typing.Generator[tuple[str, str, int], None, None]:
    """Returns the call stack as a list of tuples (function name, filename, line number)."""

    while frame:
        yield (
            frame.f_code.co_name,
            os.path.abspath(frame.f_code.co_filename),
            frame.f_lineno,
        )
        frame = frame.f_back


def get_variables(
    frame: types.FrameType,
) -> typing.Generator[tuple[str, dict, bool | None], None, None]:
    """Returns section name, variable mapping, and whether tree nodes should be expanded."""

    code_info = {
        "name": frame.f_code.co_name,
        "filename": frame.f_code.co_filename,
        "firstlineno": frame.f_code.co_firstlineno,
        "argcount": frame.f_code.co_argcount,
        "posonlyargcount": frame.f_code.co_posonlyargcount,
        "kwonlyargcount": frame.f_code.co_kwonlyargcount,
        "nlocals": frame.f_code.co_nlocals,
        "stacksize": frame.f_code.co_stacksize,
        "flags": frame.f_code.co_flags,
        "code": repr(frame.f_code.co_code),  # Use repr for bytes
        "consts": frame.f_code.co_consts,
        "names": frame.f_code.co_names,
        "varnames": frame.f_code.co_varnames,
        "freevars": frame.f_code.co_freevars,
        "cellvars": frame.f_code.co_cellvars,
    }

    if sys.version_info >= (3, 10):
        code_info["co_linetable"] = repr(frame.f_code.co_linetable)
        code_info["co_lines"] = list(frame.f_code.co_lines())
    else:
        code_info["co_lnotab"] = repr(frame.f_code.co_lnotab)

    if sys.version_info >= (3, 11):
        code_info["co_exceptiontable"] = repr(frame.f_code.co_exceptiontable)
        code_info["co_qualname"] = frame.f_code.co_qualname
        code_info["co_positions"] = list(frame.f_code.co_positions())

    yield "Code Info", code_info
    yield "Globals", frame.f_globals
    yield "Locals", frame.f_locals, True
