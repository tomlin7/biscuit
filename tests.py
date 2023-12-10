import tkinter as tk
from math import sqrt

from Box2D.b2 import dynamicBody, polygonShape, staticBody, world

root = tk.Tk()
canvas = tk.Canvas(root, width=600, height=400, bg="white")
canvas.pack()

world = world(gravity=(0, 10), doSleep=False)

floor = world.CreateStaticBody(position=(400, 380))
floor.CreatePolygonFixture(box=(80, 10), friction=0.2)
floor = world.CreateStaticBody(position=(200, 380))
floor.CreatePolygonFixture(box=(50, 10), friction=0.2)

squares = []
def create_square(x, y):
    body = world.CreateDynamicBody(position=(x, y), angle=0)
    shape = polygonShape(box=(30, 30))
    fixture = body.CreateFixture(shape=shape, density=1, friction=0.3)
    square = {'body': body, 'shape': shape, 'fixture': fixture}
    squares.append(square)

def explosion_force(center, strength, radius):
    for square in squares:
        position = square['body'].position
        distance = sqrt((position.x - center[0]) ** 2 + (position.y - center[1]) ** 2)

        if distance <= radius:
            direction = (position.x - center[0], position.y - center[1])
            force = (direction[0] * strength, direction[1] * strength)
            square['body'].ApplyForce(force, square['body'].position, True)

def handle_mouse_click(event):
    pos = (event.x, event.y)
    explosion_force(pos, 50000, 200)

def update_game():
    world.Step(1.0 / 60, 6, 2)
    canvas.delete("all")
    for square in squares:
        square_coords = [square['body'].transform * v for v in square['shape'].vertices]
        rotated_coords = [(v.x, v.y) for v in square_coords]
        canvas.create_polygon(rotated_coords, fill="red")

    root.after(1, update_game)

create_square(200, 200)
create_square(200, 200)
create_square(200, 200)
create_square(200, 200)
create_square(400, 300)
create_square(400, 300)
create_square(400, 300)
create_square(400, 300)

canvas.bind("<Button-1>", handle_mouse_click)
update_game()
root.mainloop()