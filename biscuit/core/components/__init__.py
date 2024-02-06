"""Components
Contains all the components of editor (Editor, Games, Git, LSP, Extensions Manager, Views, Menus and Palette)
"""
from .editors import BaseEditor, Editor
from .floating import *
from .games import BaseGame, register_game
from .git import Git
from .lsp import LanguageServerManager
from .views import *
