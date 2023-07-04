import tkinter as tk
import random

# Game constants
WIDTH = 1200
HEIGHT = 400
BALL_RADIUS = 20
PADDLE_WIDTH = 10
PADDLE_HEIGHT = 80
PADDLE_SPEED = 5

# Game variables
ball_dx = ball_dy = 5
paddle1_dy = paddle2_dy = 0
score1 = score2 = 0

# Function to update the game state
def update_game():
    global ball_dx, ball_dy, score1, score2

    # Move the paddles
    canvas.move(paddle1, 0, paddle1_dy)
    canvas.move(paddle2, 0, paddle2_dy)

    # Move the ball
    canvas.move(ball, ball_dx, ball_dy)

    # Get the current position of the ball and paddles
    ball_pos = canvas.coords(ball)
    paddle1_pos = canvas.coords(paddle1)
    paddle2_pos = canvas.coords(paddle2)

    # Ball collision with paddles
    if ball_pos[0] <= PADDLE_WIDTH and paddle1_pos[1] < ball_pos[1] < paddle1_pos[3]:
        ball_dx = abs(ball_dx)
    elif ball_pos[2] >= WIDTH - PADDLE_WIDTH and paddle2_pos[1] < ball_pos[1] < paddle2_pos[3]:
        ball_dx = -abs(ball_dx)

    # Ball collision with walls
    if ball_pos[1] <= 0 or ball_pos[3] >= HEIGHT:
        ball_dy = -ball_dy

    # Ball out of bounds
    if ball_pos[0] <= 0:
        score2 += 1
        canvas.itemconfig(score2_text, text=score2)
        reset_ball()
    elif ball_pos[2] >= WIDTH:
        score1 += 1
        canvas.itemconfig(score1_text, text=score1)
        reset_ball()

    # Schedule the next update
    canvas.after(15, update_game)

# Function to handle paddle movement
def move_paddle(event):
    global paddle1_dy, paddle2_dy

    # Move paddle 1
    if event.keysym == 'w':
        paddle1_dy = -PADDLE_SPEED
    elif event.keysym == 's':
        paddle1_dy = PADDLE_SPEED

    # Move paddle 2
    if event.keysym == 'Up':
        paddle2_dy = -PADDLE_SPEED
    elif event.keysym == 'Down':
        paddle2_dy = PADDLE_SPEED

# Function to handle paddle stop
def stop_paddle(event):
    global paddle1_dy, paddle2_dy

    # Stop paddle 1
    if event.keysym in ['w', 's']:
        paddle1_dy = 0

    # Stop paddle 2
    if event.keysym in ['Up', 'Down']:
        paddle2_dy = 0

# Function to reset the ball position
def reset_ball():
    canvas.coords(ball, WIDTH/2 - BALL_RADIUS, HEIGHT/2 - BALL_RADIUS, WIDTH/2 + BALL_RADIUS, HEIGHT/2 + BALL_RADIUS)
    canvas.move(ball, random.choice([-1, 1]) * random.randint(2, 4), random.choice([-1, 1]) * random.randint(2, 4))

# Create the main window
window = tk.Tk()
window.title("Pong")

# Create the canvas
canvas = tk.Canvas(window, width=WIDTH, height=HEIGHT, bg='black')
canvas.pack()

# Create the paddles
paddle1 = canvas.create_rectangle(10, HEIGHT/2 - PADDLE_HEIGHT/2, 20, HEIGHT/2 + PADDLE_HEIGHT/2, fill='white')
paddle2 = canvas.create_rectangle(WIDTH - 20, HEIGHT/2 - PADDLE_HEIGHT/2, WIDTH - 10, HEIGHT/2 + PADDLE_HEIGHT/2, fill='white')

# Create the ball
ball = canvas.create_oval(WIDTH/2 - BALL_RADIUS, HEIGHT/2 - BALL_RADIUS, WIDTH/2 + BALL_RADIUS, HEIGHT/2 + BALL_RADIUS, fill='white')

# Create the score display
score1_text = canvas.create_text(WIDTH/4, 50, text=score1, fill='white', font=('Arial', 40, 'bold'))
score2_text = canvas.create_text(3 * WIDTH/4, 50, text=score2, fill='white', font=('Arial', 40, 'bold'))

# Bind key events for paddle movement
window.bind('<KeyPress>', move_paddle)
window.bind('<KeyRelease>', stop_paddle)

# Start the game
update_game()

# Run the main loop
window.mainloop()

