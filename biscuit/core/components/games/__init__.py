from .tetris import Tetris
from .whoops import Whoops

def get_game(name):
    "picks the right game for the given name"
    match name:
        case "tetris":
            return Tetris
        
        case _:
            return Whoops
