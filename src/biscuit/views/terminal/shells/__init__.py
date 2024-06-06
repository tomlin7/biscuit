"""Shell classes for the terminal view."""

import platform

from .bash import Bash
from .cmd import CommandPrompt
from .default import Default
from .powershell import PowerShell

SHELLS = [Default, PowerShell]

if platform.system() == "Windows":
    SHELLS.append(CommandPrompt)
elif platform.system() == "Linux":
    SHELLS.append(Bash)

# def get_shells(base):
#     return [(i, lambda i=i: base.open_shell(i)) for i in shells.keys()]

# def get_shell(name):
#     return shells.get(name, Default)

# def register_shell(shell):
#     global shells
#     try:
#         shells[shell.name] = shell
#     except AttributeError:
#         shells[f"shell {len(shells) + 1}"] = shell
