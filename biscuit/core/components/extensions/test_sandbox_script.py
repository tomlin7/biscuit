# Example extension script (extension_script.py)
def run():
    import math
    import random

    print("Extension is running!")
    print("Square root of 25:", math.sqrt(25))
    print("Random number:", random.randint(1, 10))
    print("Accessing restricted module (should raise an error):")
    import os  # Restricted module
    print(os.getcwd())  # This line won't be executed