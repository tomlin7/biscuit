__author__ = "cid0rz"


import tkinter as tk
import random

WIDTH = 800
HEIGHT = 800
DELAY = 150
DOT_SIZE = 20
ALL_DOTS = WIDTH * HEIGHT // (DOT_SIZE ** 2)
RAND_POS = WIDTH // DOT_SIZE


class Extension:
    def __init__(self, api):
        self.api = api

        class Snake(api.Game):
            name = "Snake"
            
            def __init__(self, master):
                super().__init__(master)

                self.cv = tk.Canvas(self, width=WIDTH*DOT_SIZE, height=HEIGHT*DOT_SIZE, borderwidth=0, highlightthickness=0, **self.base.theme.editors)
                self.cv.pack(fill=tk.BOTH, expand=True)
                
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
                    self.cv.create_rectangle(x, y, x + DOT_SIZE, y + DOT_SIZE, fill=self.base.theme.biscuit_dark, tag="snake")
                    
                self.cv.create_rectangle(*self.snake_pos[0], self.snake_pos[0][0] + DOT_SIZE, self.snake_pos[0][1] + DOT_SIZE, fill="red", outline="", tag="snake")
                self.food = self.cv.create_rectangle(*self.food_pos, self.food_pos[0] + DOT_SIZE, self.food_pos[1] + DOT_SIZE, fill="green", outline="", tag="food")
                
                self.cv.create_text(100, 20, text="Score: 0", tag="score", fill="white", font=("Fixedsys", 25))
                self.game_over_text = self.cv.create_text(
                    WIDTH / 2,
                    HEIGHT / 2,
                    text="Game Over",
                    fill="white",
                    font=("Fixedsys", 25),
                    state=tk.HIDDEN
                )
                
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
                
                self.snake_pos.insert(0, new_head)  # Insert the new head position at the beginning	
                self.snake_pos = self.snake_pos[:len(self.snake_pos) - 1]  # Remove the last element (tail)
                    
                self.cv.delete("snake")
                
                for x, y in self.snake_pos:
                    self.cv.create_rectangle(x, y, x + DOT_SIZE, y + DOT_SIZE, fill="white", tag="snake")
                    
                self.cv.create_rectangle(*self.snake_pos[0], self.snake_pos[0][0] + DOT_SIZE, self.snake_pos[0][1] + DOT_SIZE, fill="red", tag="snake")
                
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
                head_x, head_y = self.snake_pos[0]

                food_x, food_y = self.food_pos

                if (
                    abs(head_x - food_x) < DOT_SIZE
                    and abs(head_y - food_y) < DOT_SIZE
                ):
                    self.snake_pos.append((0, 0))
                    self.cv.create_rectangle(*self.snake_pos[-1], self.snake_pos[-1][0] + DOT_SIZE, self.snake_pos[-1][1] + DOT_SIZE, fill="white", tag="snake")
                    self.food_pos = self.random_food_pos()
                    self.cv.coords(self.food, *self.food_pos, self.food_pos[0] + DOT_SIZE, self.food_pos[1] + DOT_SIZE)
                    self.score += 1
                    self.cv.itemconfigure("score", text=f"Score: {self.score}")

                    
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
                self.cv.itemconfigure(self.game_over_text, state=tk.NORMAL)
                
            def restart_game(self):
                self.in_game = True
                self.score = 0
                self.cv.itemconfigure("score", text="Score: 0")
                self.cv.itemconfigure(self.game_over_text, state=tk.HIDDEN)
                self.snake_pos = [(100, 50), (90, 50), (80, 50)]
                self.direction = "Right"
                self.cv.delete("snake")
                self.cv.delete(self.food)
                self.food_pos = self.random_food_pos()
                self.food = self.cv.create_rectangle(*self.food_pos, self.food_pos[0] + DOT_SIZE, self.food_pos[1] + DOT_SIZE, fill="green", tag="food")
                self.create_objects()
        
        self.Snake = Snake

    def run(self):
        self.api.register_game(self.Snake)
