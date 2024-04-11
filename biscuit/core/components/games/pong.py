__author__ = "cid0rz"


import random
import tkinter as tk

from biscuit.core.utils import Canvas

from .game import BaseGame

WIDTH = 800
HEIGHT = 400
BALL_RADIUS = 10
PADDLE_WIDTH = 10
PADDLE_HEIGHT = 80
PADDLE_SPEED = 5


class Pong(BaseGame):
    name = "Pong!"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.ball_dx = self.ball_dy = 5
        self.paddle1_dy = self.paddle2_dy = 0
        self.score1 = self.score2 = 0

        self.canvas = Canvas(self, width=WIDTH, height=HEIGHT+10, **self.base.theme.editors)
        self.canvas.pack(pady=30)

        self.paddle1 = self.canvas.create_rectangle(10, HEIGHT/2 - PADDLE_HEIGHT/2, 20, HEIGHT/2 + PADDLE_HEIGHT/2, outline="", fill=self.base.theme.biscuit)
        self.paddle2 = self.canvas.create_rectangle(WIDTH - 20, HEIGHT/2 - PADDLE_HEIGHT/2, WIDTH - 10, HEIGHT/2 + PADDLE_HEIGHT/2, outline="", fill=self.base.theme.biscuit)
        self.ball = self.canvas.create_oval(WIDTH/2 - BALL_RADIUS, HEIGHT/2 - BALL_RADIUS, WIDTH/2 + BALL_RADIUS, HEIGHT/2 + BALL_RADIUS, outline="", fill=self.base.theme.biscuit)

        self.score1_text = self.canvas.create_text(WIDTH/4, 50, text=self.score1, fill=self.base.theme.biscuit_dark, font=('Fixedsys', 30, 'bold'))
        self.canvas.create_text(2 * WIDTH/4, 50, text="|", fill=self.base.theme.biscuit_dark, font=('Fixedsys', 30, 'bold'))
        self.score2_text = self.canvas.create_text(3 * WIDTH/4, 50, text=self.score2, fill=self.base.theme.biscuit_dark, font=('Fixedsys', 30, 'bold'))

        self.canvas.create_rectangle(0, 0, 1000, 10, outline="", fill=self.base.theme.biscuit_dark)
        self.canvas.create_rectangle(0, HEIGHT, 1000, HEIGHT+10, outline="", fill=self.base.theme.biscuit_dark)

        self.bind_all('<KeyPress>', self.move_paddle)
        self.bind_all('<KeyRelease>', self.stop_paddle)
        self.update_game()

    def update_game(self):
        self.canvas.move(self.paddle1, 0, self.paddle1_dy)
        self.canvas.move(self.paddle2, 0, self.paddle2_dy)

        self.canvas.move(self.ball, self.ball_dx, self.ball_dy)

        self.ball_pos = self.canvas.coords(self.ball)
        self.paddle1_pos = self.canvas.coords(self.paddle1)
        self.paddle2_pos = self.canvas.coords(self.paddle2)

        # Ball collision with paddles
        if self.ball_pos[0] <= PADDLE_WIDTH and self.paddle1_pos[1] < self.ball_pos[1] < self.paddle1_pos[3]:
            self.ball_dx = abs(self.ball_dx)
        elif self.ball_pos[2] >= WIDTH - PADDLE_WIDTH and self.paddle2_pos[1] < self.ball_pos[1] < self.paddle2_pos[3]:
            self.ball_dx = -abs(self.ball_dx)

        # Ball collision with walls
        if self.ball_pos[1] <= 0 or self.ball_pos[3] >= HEIGHT:
            self.ball_dy = -self.ball_dy

        # Ball out of bounds
        if self.ball_pos[0] <= 0:
            self.score2 += 1
            self.canvas.itemconfig(self.score2_text, text=self.score2)
            self.reset_ball()
        elif self.ball_pos[2] >= WIDTH:
            self.score1 += 1
            self.canvas.itemconfig(self.score1_text, text=self.score1)
            self.reset_ball()

        self.canvas.after(15, self.update_game)

    def move_paddle(self, event: tk.Event):
        # Move paddle 1
        if event.keysym == 'w':
            self.paddle1_dy = -PADDLE_SPEED
        elif event.keysym == 's':
            self.paddle1_dy = PADDLE_SPEED

        # Move paddle 2
        if event.keysym == 'Up':
            self.paddle2_dy = -PADDLE_SPEED
        elif event.keysym == 'Down':
            self.paddle2_dy = PADDLE_SPEED

    def stop_paddle(self, event: tk.Event):
        # Stop paddle 1
        if event.keysym in ['w', 's']:
            self.paddle1_dy = 0

        # Stop paddle 2
        if event.keysym in ['Up', 'Down']:
            self.paddle2_dy = 0

    def reset_ball(self):
        self.canvas.coords(self.ball, WIDTH/2 - BALL_RADIUS, HEIGHT/2 - BALL_RADIUS, WIDTH/2 + BALL_RADIUS, HEIGHT/2 + BALL_RADIUS)
        self.canvas.move(self.ball, random.choice([-1, 1]) * random.randint(2, 4), random.choice([-1, 1]) * random.randint(2, 4))

