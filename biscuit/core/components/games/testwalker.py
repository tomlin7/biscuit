import gymnasium as gym
import tkinter as tk
from PIL import Image, ImageTk

# Create the gym environment
env = gym.make("BipedalWalker-v3",render_mode="rgb_array")
env.reset()

# Create the tkinter window and canvas
window = tk.Tk()
canvas = tk.Canvas(window, width=800, height=600)
canvas.pack()

def render_env():
    # Render the current frame of the environment
    img = env.render()
    img = Image.fromarray(img)
    img = ImageTk.PhotoImage(img)
    canvas.create_image(0, 0, anchor=tk.NW, image=img)
    canvas.image = img
n=0
def reset(*_):
    global n
    n+=1
    print(f"ep: {n} ------")
    env.reset()

def update():
    render_env()
    action = env.action_space.sample()
    a, _, done, done2, _ = env.step(action)
    if done or done2:
        print(a)
        reset()
        
    window.after(1, update)

window.bind("<space>", reset)

update()
window.mainloop()