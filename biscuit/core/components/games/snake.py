import tkinter as tk
import random

# Constants
WIDTH = 400
HEIGHT = 400
DELAY = 150
DOT_SIZE = 10
ALL_DOTS = WIDTH * HEIGHT // (DOT_SIZE ** 2)
RAND_POS = WIDTH // DOT_SIZE

# Snake class
class Snake(tk.Canvas):
    def __init__(self, master):
        super().__init__(master, width=WIDTH, height=HEIGHT, background="black", highlightthickness=0)
        
        self.master = master
        
        self.snake_pos = [(100, 50), (90, 50), (80, 50)]
        self.food_pos = self.random_food_pos()
        self.direction = "Right"
        self.in_game = True
        self.score = 0
        
        self.bind_all("<Key>", self.on_key_press)
        
        self.create_objects()
        
        self.after(DELAY, self.update_game)
        
    def create_objects(self):
        for x, y in self.snake_pos:
            self.create_rectangle(x, y, x + DOT_SIZE, y + DOT_SIZE, fill="white", tag="snake")
            
        self.create_rectangle(*self.snake_pos[0], self.snake_pos[0][0] + DOT_SIZE, self.snake_pos[0][1] + DOT_SIZE, fill="red", tag="snake")
        self.food = self.create_rectangle(*self.food_pos, self.food_pos[0] + DOT_SIZE, self.food_pos[1] + DOT_SIZE, fill="green", tag="food")
        
        self.create_text(50, 12, text="Score: 0", tag="score", fill="white")
        self.game_over_text = self.create_text(
            WIDTH / 2,
            HEIGHT / 2,
            text="Game Over",
            fill="white",
            font=("Arial", 20),
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
        
        self.snake_pos = [new_head] + self.snake_pos[:-1]
        
        self.delete("snake")
        
        for x, y in self.snake_pos:
            self.create_rectangle(x, y, x + DOT_SIZE, y + DOT_SIZE, fill="white", tag="snake")
            
        self.create_rectangle(*self.snake_pos[0], self.snake_pos[0][0] + DOT_SIZE, self.snake_pos[0][1] + DOT_SIZE, fill="red", tag="snake")
        
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
            self.create_rectangle(*self.snake_pos[-1], self.snake_pos[-1][0] + DOT_SIZE, self.snake_pos[-1][1] + DOT_SIZE, fill="white", tag="snake")
            self.food_pos = self.random_food_pos()
            self.coords(self.food, *self.food_pos, self.food_pos[0] + DOT_SIZE, self.food_pos[1] + DOT_SIZE)
            self.score += 1
            self.itemconfigure("score", text=f"Score: {self.score}")
            
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
        self.itemconfigure(self.game_over_text, state=tk.NORMAL)
        
    def restart_game(self):
        self.in_game = True
        self.score = 0
        self.itemconfigure("score", text="Score: 0")
        self.itemconfigure(self.game_over_text, state=tk.HIDDEN)
        self.snake_pos = [(100, 50), (90, 50), (80, 50)]
        self.direction = "Right"
        self.delete("snake")
        self.delete(self.food)
        self.food_pos = self.random_food_pos()
        self.food = self.create_rectangle(*self.food_pos, self.food_pos[0] + DOT_SIZE, self.food_pos[1] + DOT_SIZE, fill="green", tag="food")
        self.create_objects()


# Main game window
root = tk.Tk()
root.title("Snake")
root.resizable(0, 0)

snake = Snake(root)
snake.pack()

root.mainloop()

