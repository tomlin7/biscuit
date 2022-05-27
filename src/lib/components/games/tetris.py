import tkinter as tk
from random import choice

SIDE = 20


class Tetris(tk.Toplevel):
    """The tetris game"""
    WIDTH = 10 * SIDE
    HEIGHT = 20 * SIDE

    def __init__(self, parent):
        super().__init__(parent)
        self.geometry("500x800")
        self.title("Tetris on Biscuit")
        self.score = 0
        self.level = 1
        self.speed = 500
        self.pieces = {}
        self.board = tk.Canvas(self, width=Tetris.WIDTH, height=Tetris.HEIGHT, bg='black')
        self.board.pack()
        self.lines_cleared = []
        self.total_lines = 0
        self.bind("<Key>", self.handle_events)
        self.start()

    def start(self):
        self.falling_piece = Piece(self.board)
        self.run()
        
    def run(self):
        
        self.after(self.speed, self.run)
        
    def handle_events(self, event):
        '''Handle all user events.'''
        if event.keysym == "Left": self.falling_piece.move(-1, 0)
        if event.keysym == "Right": self.falling_piece.move(1, 0)
        if event.keysym == "Down": self.falling_piece.move(0, 1)
        if event.keysym == "Up": self.falling_piece.rotate()
        
    def get_score(self):
        total_lines = 0
        points = [0, 40, 100, 300, 1200]

        for lines in self.lines_cleared:
            level = divmod(total_lines, 10)[0] + 1
            total_lines += lines
            score += level*points[lines]

        return score


class Piece:
    """A tetris piece"""
    START_PT = 10*SIDE / 2 / SIDE * SIDE - SIDE
    PIECES = (
        ["yellow", (0, 0), (1, 0), (0, 1), (1, 1)],     # square
        ["lightblue", (0, 0), (1, 0), (2, 0), (3, 0)],  # line
        ["orange", (2, 0), (0, 1), (1, 1), (2, 1)],     # right el
        ["blue", (0, 0), (0, 1), (1, 1), (2, 1)],       # left el
        ["green", (0, 1), (1, 1), (1, 0), (2, 0)],      # right wedge
        ["red", (0, 0), (1, 0), (1, 1), (2, 1)],        # left wedge
        ["purple", (1, 0), (0, 1), (1, 1), (2, 1)],     # symmetrical wedge
    )

    def __init__(self, canvas):

        self.squares = []
        self.piece = choice(Piece.PIECES)
        self.color = self.piece.pop(0)
        self.canvas = canvas

        for point in self.piece:
            square = canvas.create_rectangle(
                point[0] * SIDE + Piece.START_PT,
                point[1] * SIDE,
                point[0] * SIDE + SIDE + Piece.START_PT,
                point[1] * SIDE + SIDE,
                fill=self.color)
            self.squares.append(square)

    def move(self, x, y):
        if not self.is_move_allowed(x,y):
            return False
        else:
            for square in self.squares:
                self.canvas.move(square, x * SIDE, y * SIDE)
    
    def rotate(self):
        squares = self.squares[:]
        pivot = sq.pop(2)

        def get_move_coords(square, pivot):
            sq_coords = self.canvas.coords(square)
            pivot_coords = self.canvas.coords(pivot)
            x_diff = sq_coords[0] - pivot_coords[0]
            y_diff = sq_coords[1] - pivot_coords[1]
            x_move = (- x_diff - y_diff) / SIDE
            y_move = (x_diff - y_diff) / SIDE
            return x_move, y_move

        #check if its allowed
        for sq in squares:
            xmove, ymove = get_move_coords(sq, pivot)
            if not self.is_sq_allowed(sq, xmove, ymove):
                return False
        #actually rotate
        for sq in squares:
            xmove, ymove = get_move_coords(sq, pivot)
            self.canvas.move(sq, xmove, ymove)

    def is_sq_allowed(self, sq, x, y):

        x = x * SIDE
        y = y * SIDE
        coords = self.canvas.coords(sq)

        if coords[3] + y > Tetris.HEIGHT: return False
        if coords[2] + x < 0 : return False
        if coords[2] + x > Tetris.WIDTH: return False

        overlap = set(self.canvas.find_overlapping(
            (coords[0] + coords[2]) / 2 + x,
            (coords[1] + coords[3]) / 2 + y,
            (coords[0] + coords[2]) / 2 + x,
            (coords[1] + coords[3]) / 2 + y))

        other = set(self.canvas.find_all()) - set(self.squares)

        if overlap and other: return False

        return True

    def is_move_allowed(self, x, y):

        for sq in self.squares:
            if not self.is_sq_allowed(sq, x, y): return False
        return True
        


root = tk.Tk()
t = Tetris(root)
t.lift()

root.mainloop()


