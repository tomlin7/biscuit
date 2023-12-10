from dataclasses import dataclass
from typing import List


@dataclass
class BaseDataClass:
    ...

class CompletionRequest(BaseDataClass):
    id: int
    cursor: str

class Completion(BaseDataClass):
    display_text: str
    replace_start: str
    replace_end: str
    replace_text: str
    filter_text: str
    documentation: str

class CompletionResponse(BaseDataClass):
    id: int
    completions: List[Completion]

@dataclass
class LangServerConfig:
    command: str
    language_id: str