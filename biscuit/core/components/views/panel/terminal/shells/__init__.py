from .default import Default
from .powershell import PowerShell

# shells = {i.name:i for i in (Default, PowerShell)}

def get_shells(base):
    return [(f"Play {i}", lambda i=i: base.open_shell(i)) for i in shells.keys()]

def get_shell(name):
    return shells.get(name, Default)

def register_shell(shell):
    global shells
    try:
        shells[shell.name] = shell
    except AttributeError:
        shells[f"shell {len(shells) + 1}"] = shell
