import random
import tkinter as tk

from .game import BaseGame


# a simple physics engine
class PhysicsObject:
    def __init__(self, canvas, x, y, width, height, color='black'):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.color = color
        self.canvas = canvas

        self.vel_x = 0
        self.vel_y = 0
        self.accel_x = 0
        self.accel_y = 0

        self.is_jumping = False

        self.shape = self.canvas.create_rectangle(
            self.x, self.y, self.x + self.width, self.y + self.height, fill=self.color, outline=""
        )

    def update(self):
        self.vel_x += self.accel_x
        self.vel_y += self.accel_y

        self.x += self.vel_x
        self.y += self.vel_y

        self.canvas.coords(self.shape, self.x, self.y, self.x + self.width, self.y + self.height)

    def jump(self, *_):
        if not self.is_jumping:
            self.is_jumping = True
            self.vel_y = -10

    def check_collision(self, other):
        if (self.x < other.x + other.width and
            self.x + self.width > other.x and
            self.y < other.y + other.height and
            self.y + self.height > other.y):
            return True
        return False


class Whoops(BaseGame):
    name = "404"
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.config(bg='#22223b')
        self.gravity = 0.5
        self.canvas = tk.Canvas(self, width=800, height=400, bg='#22223b', borderwidth=0, highlightthickness=0)
        self.canvas.pack(pady=30)

        self.canvas.create_text(390, 100, text="404", fill='#4a4e69', font=("Fixedsys", 50))
        self.car = PhysicsObject(self.canvas, 100, 100, 60, 30, '#f2e9e4')
        self.ground = PhysicsObject(self.canvas, 0, 350, 800, 50, '#4a4e69')
        self.obstacles = []

        self.min_obstacle_gap = 2
        self.obstacle_spawnpoint = 800

        self.bind_all('<space>', self.car.jump)
        self.focus_set()

        self.update_game()
        self.update_obstacles()

    def apply_gravity(self, car):
        if not car.is_jumping:
            car.accel_y = self.gravity

    def update_game(self):
        self.car.update()
        self.apply_gravity(self.car)

        if self.car.y + self.car.height >= self.ground.y:
            self.car.y = self.ground.y - self.car.height
            self.car.vel_y = 0
            self.car.is_jumping = False

        self.car.check_collision(self.ground)
        self.after(10, self.update_game)
        
    def spawn_obstacle(self):
        obstacle_width = random.randint(40, 80)
        obstacle_height = random.randint(80, 200)
        obstacle_x = self.obstacle_spawnpoint
        obstacle_y = self.ground.y - obstacle_height

        obstacle = PhysicsObject(self.canvas, obstacle_x, obstacle_y, obstacle_width, obstacle_height, random.choice(['#9a8c98', '#4a4e69']))
        self.obstacles.append(obstacle)
        self.canvas.tag_lower(obstacle.shape)

    def update_obstacles(self):
        for obstacle in self.obstacles:
            obstacle.vel_x = -3
            obstacle.update()

            if obstacle.x + obstacle.width < 0:
                self.canvas.delete(obstacle.shape)
                self.obstacles.remove(obstacle)

        # spawn a new obstacle if there's enough gap between the last one and the right side of the canvas
        if not len(self.obstacles) or self.obstacle_spawnpoint - (self.obstacles[-1].x + self.obstacles[-1].width) >= self.min_obstacle_gap:
            self.spawn_obstacle()

        self.after(10, self.update_obstacles)
