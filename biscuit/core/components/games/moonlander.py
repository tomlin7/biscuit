import tkinter as tk

GRAVITY = 0.1
THRUST_POWER = 0.2

class MoonlanderGame:
    def __init__(self):
        self.window = tk.Tk()
        self.window.title("Moonlander")
        self.window.geometry("600x600")

        self.canvas = tk.Canvas(self.window, width=600, height=600)
        self.canvas.pack()

        self.background_img = tk.PhotoImage(file="background.png")
        self.canvas.create_image(0, 0, anchor=tk.NW, image=self.background_img)

        self.rocketship_img = tk.PhotoImage(file="rocketship.png")
        self.rocketship = self.canvas.create_image(300, 100, image=self.rocketship_img)

        self.fuel_gauge = self.canvas.create_rectangle(10, 10, 110, 20, fill="green")

        self.fuel = 100.0
        self.velocity = 0.0
        self.position = 100.0
        self.game_over = False

        self.window.bind("<space>", self.thrust)
        self.window.bind("<r>", self.restart_game)

        self.update()
        self.window.mainloop()

    def thrust(self, event):
        if self.fuel > 0 and not self.game_over:
            self.velocity -= THRUST_POWER
            self.fuel -= 1
            self.canvas.move(self.fuel_gauge, 1, 0)

    def restart_game(self, event):
        self.fuel = 100.0
        self.velocity = 0.0
        self.position = 100.0
        self.game_over = False
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, anchor=tk.NW, image=self.background_img)
        self.rocketship = self.canvas.create_image(300, 100, image=self.rocketship_img)
        self.fuel_gauge = self.canvas.create_rectangle(10, 10, 110, 20, fill="green")
        self.update()

    def update(self):
        if not self.game_over:
            self.velocity += GRAVITY
            self.position += self.velocity
            self.canvas.move(self.rocketship, 0, self.velocity)

            if self.position > 550:
                self.game_over = True
                self.canvas.create_text(300, 300, text="Crashed!", fill="red", font=("Arial", 30))
            elif self.fuel <= 0:
                self.game_over = True
                self.canvas.create_text(300, 300, text="Out of fuel!", fill="red", font=("Arial", 30))
            else:
                self.window.after(20, self.update)

game = MoonlanderGame()
