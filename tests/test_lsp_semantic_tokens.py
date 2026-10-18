from biscuit.language.semantic_tokens import SemanticTokensDecoder

def test_semantic_tokens_decoder():
    decoder = SemanticTokensDecoder()
    # 5 integers per token: deltaLine, deltaStart, length, tokenType, tokenModifiers
    raw_data = [2, 5, 8, 1, 0, 0, 10, 4, 10, 0]
    tokens = decoder.decode_raw_tokens(raw_data)
    assert len(tokens) == 2
    assert tokens[0].line == 2
    assert tokens[0].start_char == 5
    assert tokens[0].length == 8
    assert tokens[0].token_type == "class"

    assert tokens[1].line == 2
    assert tokens[1].start_char == 15
    assert tokens[1].token_type == "function"
