from __future__ import annotations
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class SemanticToken:
    line: int
    start_char: int
    length: int
    token_type: str
    modifiers: List[str]

class SemanticTokensDecoder:
    TOKEN_TYPES = [
        "type", "class", "enum", "interface", "struct", "typeParameter",
        "parameter", "variable", "property", "enumMember", "function", "method"
    ]

    def decode_raw_tokens(self, data: List[int]) -> List[SemanticToken]:
        tokens = []
        cur_line = 0
        cur_char = 0
        for i in range(0, len(data), 5):
            delta_line = data[i]
            delta_char = data[i + 1]
            length = data[i + 2]
            token_type_idx = data[i + 3]

            cur_line += delta_line
            cur_char = cur_char + delta_char if delta_line == 0 else delta_char
            token_type = self.TOKEN_TYPES[token_type_idx] if token_type_idx < len(self.TOKEN_TYPES) else "variable"
            tokens.append(SemanticToken(cur_line, cur_char, length, token_type, []))
        return tokens
