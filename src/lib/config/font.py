from dataclasses import dataclass


@dataclass
class Font:
    family: str
    size: int
    style: str