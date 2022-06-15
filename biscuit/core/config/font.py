from dataclasses import dataclass


@dataclass
class Font:
    """
    Holds a font for Biscuit.
    """
    family: str
    size: int
    style: str