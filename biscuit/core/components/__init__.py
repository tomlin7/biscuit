"""Components
Contains all the components of editor (Editor, Games, Git, LSP, Extensions Manager, Views, Menus and Palette)
"""
from .editors import BaseEditor, Editor
from .extensions import ExtensionManager
from .floating import *
from .games import BaseGame, register_game
from .git import Git
from .history import HistoryManager
from .lsp import LanguageServerManager
from .views import *
