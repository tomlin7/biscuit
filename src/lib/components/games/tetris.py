import tkinter as tk
from random import choice

SIDE = 25


class Tetris(tk.Toplevel):
    """The tetris game"""
    WIDTH = 10 * SIDE
    HEIGHT = 20 * SIDE

    def __init__(self, parent):
        super().__init__(parent)
        self.geometry("500x600")
        self.title("Tetris on Biscuit")
        self.score = 0
        self.level = 1
        self.speed = 500
        self.pieces = {}
        self.status_var = tk.StringVar()
        self.update_status()
        self.status_label = tk.Label(self, textvariable=self.status_var, width=40)
        self.status_label.pack(side='top', pady=SIDE)
        self.board = tk.Canvas(self, width=Tetris.WIDTH,
                               height=Tetris.HEIGHT, bg='black')
        self.board.pack(side='left', padx=(2*SIDE,0))
        self.preview = tk.Canvas(self, width=4*SIDE, height=2*SIDE, bg='white')
        self.preview.pack(side='right', padx=(0, 2*SIDE))
        self.lines_cleared = []
        self.total_lines = 0
        self.bind("<Key>", self.handle_events)
        self.start()

    def start(self):
        self.falling_piece = Piece(self.preview)
        self.preview.delete('all')
        self.falling_piece.canvas=self.board
        self.falling_piece.place_on_board()
        self.next_piece = Piece(self.preview)
        self.run()
        
    def run(self):
        
        if not self.falling_piece.move(0,1):
            #print("stopped")
            #check for lines to clear
            #update state
            #create a new piece
            self.falling_piece = self.next_piece
            self.falling_piece.canvas=self.board
            self.falling_piece.place_on_board()
            self.preview.delete('all')
            self.next_piece = Piece(self.preview)
            







        
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
    def update_status(self):
        self.status_var.set(f"Level: {self.level}  Score: {self.score}")

class Piece:
    """A tetris piece"""
    START_PT = 10*SIDE / 2 / SIDE * SIDE - SIDE

    def __init__(self, canvas):
        self.PIECES = (
        ["yellow", (0, 0), (1, 0), (0, 1), (1, 1)],     # square
        ["lightblue", (0, 0), (1, 0), (2, 0), (3, 0)],  # line
        ["orange", (2, 0), (0, 1), (1, 1), (2, 1)],     # right el
        ["blue", (0, 0), (0, 1), (1, 1), (2, 1)],       # left el
        ["green", (0, 1), (1, 1), (1, 0), (2, 0)],      # right wedge
        ["red", (0, 0), (1, 0), (1, 1), (2, 1)],        # left wedge
        ["purple", (1, 0), (0, 1), (1, 1), (2, 1)],     # symmetrical wedge
    )

        self.squares = []
        self.piece = choice(self.PIECES)
        self.color = self.piece.pop(0)
        self.canvas = canvas

        for point in self.piece:
            square = canvas.create_rectangle(
                point[0] * SIDE,
                point[1] * SIDE,
                point[0] * SIDE + SIDE,
                point[1] * SIDE + SIDE,
                fill=self.color)
            self.squares.append(square)
        
    def place_on_board(self):
        self.squares = []
        for point in self.piece:
            square = self.canvas.create_rectangle(
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
            return True
    
    def rotate(self):
        squares = self.squares[:]
        pivot = squares.pop(2)

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
            self.canvas.move(sq, xmove*SIDE, ymove*SIDE)

    def is_sq_allowed(self, sq, x, y):

        x = x * SIDE
        y = y * SIDE
        coords = self.canvas.coords(sq)

        if coords[3] + y > Tetris.HEIGHT: return False
        if coords[2] + x <= 0 : return False
        if coords[2] + x > Tetris.WIDTH: return False

        overlap = set(self.canvas.find_overlapping(
            (coords[0] + coords[2]) / 2 + x,
            (coords[1] + coords[3]) / 2 + y,
            (coords[0] + coords[2]) / 2 + x,
            (coords[1] + coords[3]) / 2 + y)) - set(self.squares)

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


