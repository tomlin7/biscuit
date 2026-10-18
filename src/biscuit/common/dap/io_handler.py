"""
Debug Adapter Protocol (DAP) IO handler.

This module handles the parsing and serialization of DAP messages.
"""

import json
import re
import typing as t

from pydantic import TypeAdapter

from .protocol import Event, Request, Response

_CONTENT_TYPE_PARAM_RE = re.compile(r'(\w+)\s*=\s*(?:(?:"([^"]*)")|([^;,\s]*))')


def _make_headers(content_length: int, encoding: str = "utf-8") -> bytes:
    """Create headers for DAP messages.

    Per the DAP overview, the only required header is `Content-Length`.
    We intentionally omit `Content-Type` to be maximally compatible with
    adapters that only implement the minimal header handling.
    """
    headers_bytes = bytearray()
    headers_bytes += f"Content-Length: {content_length}\r\n".encode(encoding)
    headers_bytes += b"\r\n"
    return headers_bytes


def _make_request(
    command: str,
    arguments: t.Optional[t.Dict[str, t.Any]] = None,
    seq: t.Optional[int] = None,
    *,
    encoding: str = "utf-8",
) -> bytes:
    """Create a DAP request message."""
    request = bytearray()

    content: t.Dict[str, t.Any] = {
        "type": "request",
        "command": command
    }
    if arguments is not None:
        content["arguments"] = arguments
    if seq is not None:
        content["seq"] = seq
    
    encoded_content = json.dumps(content).encode(encoding)

    request += _make_headers(content_length=len(encoded_content), encoding=encoding)
    request += encoded_content

    return request


def _make_response(
    seq: int,
    request_seq: int,
    command: str,
    success: bool,
    result: t.Optional[t.Dict[str, t.Any]] = None,
    error: t.Optional[t.Dict[str, t.Any]] = None,
    message: t.Optional[str] = None,
    *,
    encoding: str = "utf-8",
) -> bytes:
    """Create a DAP response message."""
    response = bytearray()

    # Set up the DAP content and encode it.
    content: t.Dict[str, t.Any] = {
        "type": "response",
        "seq": seq,
        "request_seq": request_seq,
        "command": command,
        "success": success
    }
    if result is not None:
        content["body"] = result
    if error is not None:
        content["body"] = {"error": error}
    if message is not None:
        content["message"] = message
        
    encoded_content = json.dumps(content).encode(encoding)

    response += _make_headers(content_length=len(encoded_content), encoding=encoding)
    response += encoded_content

    return response


def _make_event(
    event: str,
    body: t.Optional[t.Dict[str, t.Any]] = None,
    seq: t.Optional[int] = None,
    *,
    encoding: str = "utf-8",
) -> bytes:
    """Create a DAP event message."""
    event_msg = bytearray()

    content: t.Dict[str, t.Any] = {
        "type": "event",
        "event": event
    }
    if body is not None:
        content["body"] = body
    if seq is not None:
        content["seq"] = seq
        
    encoded_content = json.dumps(content).encode(encoding)

    event_msg += _make_headers(content_length=len(encoded_content), encoding=encoding)
    event_msg += encoded_content

    return event_msg


def _parse_content_type(header: str) -> tuple[str, dict[str, str]]:
    """Parse Content-Type header."""
    content_type, _, param_string = header.partition(";")
    content_type = content_type.strip().lower()

    metadata = {
        m.group(1).lower(): (m.group(2) or m.group(3))
        for m in _CONTENT_TYPE_PARAM_RE.finditer(param_string)
    }

    return content_type, metadata


def _parse_one_message(
    response_buf: bytearray,
) -> t.Optional[t.Iterable[t.Union[Request, Response, Event]]]:
    """Parse a single DAP message from a bytearray."""
    
    if b"\r\n\r\n" not in response_buf:
        return None

    header_lines, raw_content = bytes(response_buf).split(b"\r\n\r\n", 1)

    headers = {"content-type": "application/vscode-jsonrpc; charset=utf-8"}
    for header_line in header_lines.split(b"\r\n"):
        if b":" in header_line:
            key, value = header_line.decode("ascii").split(": ", 1)
            headers[key.lower()] = value
    
    assert "content-length" in headers
    
    # Content-Type and encoding (default if not provided)
    if "content-type" in headers:
        content_type, metadata = _parse_content_type(headers["content-type"])
        assert content_type == "application/vscode-jsonrpc"
        encoding = metadata.get("charset", "utf-8")
    else:
        # Default to utf-8 if no content-type header
        encoding = "utf-8"

    content_length = int(headers["content-length"])
    if len(raw_content) < content_length:
        return None
    unused_bytes_count = len(raw_content) - content_length
    raw_content = raw_content[:content_length]
    if unused_bytes_count == 0:
        response_buf.clear()
    else:
        del response_buf[:-unused_bytes_count]

    def parse_message(data: t.Dict[str, t.Any]) -> t.Union[Request, Response, Event]:
        """Parse a single message."""
        message_type = data.get("type")
        
        if message_type == "request":
            return TypeAdapter(Request).validate_python(data)
        elif message_type == "response":
            return TypeAdapter(Response).validate_python(data)
        elif message_type == "event":
            return TypeAdapter(Event).validate_python(data)
        else:
            raise ValueError(f"Unknown message type: {message_type}")

    try:
        json_str = raw_content.decode(encoding)
        content = json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON content: {e}")

    if isinstance(content, list):
        # Batch operation
        return map(parse_message, content)
    else:
        return [parse_message(content)]


def _parse_messages(response_buf: bytearray) -> t.Iterator[t.Union[Response, Request, Event]]:
    """Parse all complete DAP messages from a bytearray."""
    while True:
        parsed = _parse_one_message(response_buf)
        if parsed is None:
            break
        yield from parsed