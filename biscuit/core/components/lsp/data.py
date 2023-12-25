import dataclasses
import json
from typing import List, Optional


class Base:
    def __str__(self) -> str:
        return type(self).__name__ + json.dumps(dataclasses.asdict(self))
    
# Requests

@dataclasses.dataclass
class CompletionRequest(Base):
    id: int
    cursor: str

@dataclasses.dataclass
class JumpRequest(Base):
    file_path: str
    location: str


# Responses

@dataclasses.dataclass
class Underline:
    start: str
    end: str
    tooltip_text: str
    color: Optional[str] = None

@dataclasses.dataclass
class Underlines(Base):
    id: str
    underline_list: List[Underline]

@dataclasses.dataclass
class Completion:
    display_text: str
    replace_start: str
    replace_end: str
    replace_text: str
    filter_text: str
    documentation: str
    
    def __str__(self) -> str:
        return self.display_text

@dataclasses.dataclass
class Completions(Base):
    id: int
    completions: List[Completion]

    def __str__(self) -> str:
        return [str(i) for i in self.completions]

@dataclasses.dataclass
class Hover(Base):
    location: str
    text: str

    def __str__(self) -> str:
        return self.text

@dataclasses.dataclass
class JumpLocationRange:
    file_path: str
    start: str
    end: str

    def __str__(self) -> str:
        return self.file_path

@dataclasses.dataclass
class Jump(Base):
    location_ranges: List[JumpLocationRange]

    def __str__(self) -> str:
        return [str(i) for i in self.location_ranges]
