"""
Debug Adapter Protocol (DAP) base protocol structures.

This module implements the core protocol message types as defined in the
Debug Adapter Protocol specification.
"""

import typing as t
from typing_extensions import Literal
from pydantic import BaseModel, Field


# Base Protocol Types

class ProtocolMessage(BaseModel):
    """
    Base class of requests, responses, and events.
    
    Sequence number of the message (also known as message ID). The `seq` for
    the first message sent by a client or debug adapter is 1, and for each
    subsequent message is 1 greater than the previous message sent by that
    actor. `seq` can be used to order requests, responses, and events, and to
    associate requests with their corresponding responses. For protocol
    messages of type `request` the sequence number can be used to cancel the
    request.
    """
    seq: int
    
    """
    Message type.
    Values: 'request', 'response', 'event', etc.
    """
    type: Literal['request', 'response', 'event']


class Request(ProtocolMessage):
    """A client or debug adapter initiated request."""
    type: Literal['request'] = 'request'
    
    """The command to execute."""
    command: str
    
    """Object containing arguments for the command."""
    arguments: t.Optional[t.Dict[str, t.Any]] = None


class Event(ProtocolMessage):
    """A debug adapter initiated event."""
    type: Literal['event'] = 'event'
    
    """Type of event."""
    event: str
    
    """Event-specific information."""
    body: t.Optional[t.Dict[str, t.Any]] = None


class Response(ProtocolMessage):
    """Response for a request."""
    type: Literal['response'] = 'response'
    
    """Sequence number of the corresponding request."""
    request_seq: int
    
    """
    Outcome of the request.
    If true, the request was successful and the `body` attribute may contain
    the result of the request.
    If the value is false, the attribute `message` contains the error in short
    form and the `body` may contain additional information (see
    `ErrorResponse.body.error`).
    """
    success: bool
    
    """The command requested."""
    command: str
    
    """
    Contains the raw error in short form if `success` is false.
    This raw error might be interpreted by the client and is not shown in the
    UI.
    Some predefined values exist.
    Values:
    'cancelled': the request was cancelled.
    'notStopped': the request may be retried once the adapter is in a 'stopped'
    state.
    etc.
    """
    message: t.Optional[t.Union[Literal['cancelled', 'notStopped'], str]] = None
    
    """
    Contains request result if success is true and error details if success is
    false.
    """
    body: t.Optional[t.Dict[str, t.Any]] = None


class Message(BaseModel):
    """A structured error message."""
    id: int
    format: str
    variables: t.Optional[t.Dict[str, str]] = None
    sendTelemetry: t.Optional[bool] = None
    showUser: t.Optional[bool] = None
    url: t.Optional[str] = None
    urlLabel: t.Optional[str] = None


class ErrorResponse(Response):
    """On error (whenever `success` is false), the body can provide more details."""
    body: t.Optional[t.Dict[str, t.Any]] = Field(default_factory=dict)
    
    @property
    def error(self) -> t.Optional[Message]:
        """A structured error message."""
        if self.body and 'error' in self.body:
            return Message.model_validate(self.body['error'])
        return None


# Cancel Request Types

class CancelArguments(BaseModel):
    """
    Arguments for `cancel` request.
    
    The ID (attribute `seq`) of the request to cancel. If missing no request is
    cancelled.
    Both a `requestId` and a `progressId` can be specified in one request.
    """
    requestId: t.Optional[int] = None
    
    """
    The ID (attribute `progressId`) of the progress to cancel. If missing no
    progress is cancelled.
    Both a `requestId` and a `progressId` can be specified in one request.
    """
    progressId: t.Optional[str] = None


class CancelRequest(Request):
    """
    The `cancel` request is used by the client in two situations:
    
    * to indicate that it is no longer interested in the result produced by a specific request issued earlier
    * to cancel a progress sequence.
    
    Clients should only call this request if the corresponding capability `supportsCancelRequest` is true.
    
    This request has a hint characteristic: a debug adapter can only be expected to make a 'best effort' in honoring this request but there are no guarantees.
    
    The `cancel` request may return an error if it could not cancel an operation but a client should refrain from presenting this error to end users.
    
    The request that got cancelled still needs to send a response back. This can either be a normal result (`success` attribute true) or an error response (`success` attribute false and the `message` set to `cancelled`).
    
    Returning partial results from a cancelled request is possible but please note that a client has no generic way for detecting that a response is partial or not.
    
    The progress that got cancelled still needs to send a `progressEnd` event back.
    
    A client should not assume that progress just got cancelled after sending the `cancel` request.
    """
    command: Literal['cancel'] = 'cancel'
    arguments: t.Optional[CancelArguments] = None


class CancelResponse(Response):
    """Response to `cancel` request. This is just an acknowledgement, so no body field is required."""
    pass
