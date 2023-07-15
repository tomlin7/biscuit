import tkinter as tk
import random

from .game import BaseGame
from core.components.utils import Canvas, Button

# Constants
WIDTH = 600
HEIGHT = 600
DELAY = 150
DOT_SIZE = 10
RAND_POS = WIDTH // DOT_SIZE

class Snake(BaseGame):
    name = "Snake!"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        self.bg = self.base.theme.editors.background
        self.ui = self.base.theme.biscuit_dark
        self.head_color = self.base.theme.biscuit
        self.body_color = self.base.theme.biscuit_dark
        self.food_color = self.base.theme.primary_foreground_highlight

        self.canvas = Canvas(self, width=WIDTH, height=HEIGHT, **self.base.theme.editors)
        self.canvas.pack(pady=30)

        self.snake_pos = [(100, 50), (90, 50), (80, 50)]
        self.food_pos = self.random_food_pos()
        self.direction = "Right"
        self.in_game = True
        self.score = 0

        self.bind_all("<Key>", self.on_key_press)
        self.create_objects()
        self.update_game()

    def create_objects(self):
        for x, y in self.snake_pos:
            self.canvas.create_rectangle(x, y, x + DOT_SIZE, y + DOT_SIZE, fill=self.body_color, tag="snake", outline="")

        self.canvas.create_rectangle(*self.snake_pos[0], self.snake_pos[0][0] + DOT_SIZE, self.snake_pos[0][1] + DOT_SIZE, fill=self.head_color, outline="", tag="snake")
        self.food = self.canvas.create_rectangle(*self.food_pos, self.food_pos[0] + DOT_SIZE, self.food_pos[1] + DOT_SIZE, fill=self.food_color, outline="", tag="food")

        self.canvas.create_text(100, 20, text="Score: 0", tag="score", font=("Fixedsys", 20), fill=self.ui)
        self.game_over_text = self.canvas.create_text(WIDTH / 2, HEIGHT / 2, text="Game Over!", fill=self.ui, font=("Fixedsys", 40), state=tk.HIDDEN)
        restart = Button(self.canvas, "Retry!", self.restart_game)
        restart.config(font=("Fixedsys", 20))
        self.game_over_btn = self.canvas.create_window(WIDTH / 2, HEIGHT / 2 + 100, window=restart, state=tk.HIDDEN)

    def update_game(self):
        if self.in_game:
            self.check_collisions()
            self.move_snake()
            self.check_food_collision()
            self.after(DELAY, self.update_game)
        else:
            self.show_game_over_text()

    def move_snake(self):
        head_x, head_y = self.snake_pos[0]

        if self.direction == "Left":
            new_head = (head_x - DOT_SIZE, head_y)
        elif self.direction == "Right":
            new_head = (head_x + DOT_SIZE, head_y)
        elif self.direction == "Up":
            new_head = (head_x, head_y - DOT_SIZE)
        elif self.direction == "Down":
            new_head = (head_x, head_y + DOT_SIZE)

        self.snake_pos = [new_head] + self.snake_pos[:-1]

        self.canvas.delete("snake")

        for x, y in self.snake_pos:
            self.canvas.create_rectangle(x, y, x + DOT_SIZE, y + DOT_SIZE, fill=self.body_color, outline=self.bg, tag="snake")

        self.canvas.create_rectangle(*self.snake_pos[0], self.snake_pos[0][0] + DOT_SIZE, self.snake_pos[0][1] + DOT_SIZE, fill=self.head_color, outline=self.bg, tag="snake")

    def check_collisions(self):
        head_x, head_y = self.snake_pos[0]

        if (
            head_x < 0
            or head_x >= WIDTH
            or head_y < 0
            or head_y >= HEIGHT
            or (head_x, head_y) in self.snake_pos[1:]
        ):
            self.in_game = False

    def check_food_collision(self):
        if self.snake_pos[0] == self.food_pos:
            self.snake_pos.append((0, 0))
            self.food_pos = self.random_food_pos()
            self.canvas.coords(self.food, *self.food_pos, self.food_pos[0] + DOT_SIZE, self.food_pos[1] + DOT_SIZE)
            self.score += 1
            self.canvas.itemconfigure("score", text=f"Score: {self.score}")

    def random_food_pos(self):
        x = random.randint(1, RAND_POS - 1) * DOT_SIZE
        y = random.randint(1, RAND_POS - 1) * DOT_SIZE
        return x, y

    def on_key_press(self, e):
        key = e.keysym

        if self.in_game:
            if (
                key == "Left"
                and self.direction != "Right"
                or key == "Right"
                and self.direction != "Left"
                or key == "Up"
                and self.direction != "Down"
                or key == "Down"
                and self.direction != "Up"
            ):
                self.direction = key
        else:
            if key == "r" or key == "R":
                self.restart_game()

    def show_game_over_text(self):
        self.canvas.itemconfigure(self.game_over_text, state=tk.NORMAL)
        self.canvas.itemconfigure(self.game_over_btn, state=tk.NORMAL)

    def restart_game(self, *_):
        self.canvas.delete("food")
        self.in_game = True
        self.score = 0
        self.canvas.itemconfigure("score", text="Score: 0")
        self.canvas.itemconfigure(self.game_over_text, state=tk.HIDDEN)
        self.canvas.itemconfigure(self.game_over_btn, state=tk.HIDDEN)
        self.snake_pos = [(100, 50), (90, 50), (80, 50)]
        self.direction = "Right"
        self.canvas.delete("snake")
        self.canvas.delete(self.food)
        self.food_pos = self.random_food_pos()
        self.food = self.canvas.create_rectangle(*self.food_pos, self.food_pos[0] + DOT_SIZE, self.food_pos[1] + DOT_SIZE, fill=self.food_color, outline="", tag="food")
        self.create_objects()
        self.update_game()
