import inspect
from functools import wraps


def command_palette_ignore(func):
    """Decorator that marks a method will be marked during the method 
    extraction process for command palette."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    wrapper._ignored = True
    return wrapper

def predicate(obj):
    """Ignore built-in methods, other data"""

    return inspect.ismethod(obj) and not inspect.isbuiltin(obj)

def extract_commands(cls):
    """Extracts all methods from a class for command palette."""

    filtered = []
    methods = inspect.getmembers(cls, predicate=predicate)
    for name, method in methods:
        if not name.startswith('__') and not getattr(method, '_ignored', False):
            # TODO: make use of the documentation of commands in command palette
            # doc = inspect.getdoc(method) or "No documentation available."
            filtered.append((name, method))

    return filtered

def formalize_command(command: str) -> str:
    """Formalizes a command string to be used in the command palette."""

    return command.replace('_', ' ').capitalize()