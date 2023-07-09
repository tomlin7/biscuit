# Example extension script (extension_script.py)
def run():
    import math
    import random

    print("Extension is running!")
    print("Square root of 25:", math.sqrt(25))
    print("Random number:", random.randint(1, 10))
    import os  # Restricted module
    print("Haha i just bypassed your security *evil laugh*", os.getcwd())  # This line won't be executed