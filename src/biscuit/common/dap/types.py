"""
Debug Adapter Protocol (DAP) data types.

This module implements the core data types used throughout the DAP protocol
as defined in the specification.
"""

import typing as t
from typing_extensions import Literal
from pydantic import BaseModel


# Core Types

class Source(BaseModel):
    """A Source is a descriptor for source code."""
    name: t.Optional[str] = None
    path: t.Optional[str] = None
    sourceReference: t.Optional[int] = None
    presentationHint: t.Optional[Literal['normal', 'emphasize', 'deemphasize']] = None
    origin: t.Optional[str] = None
    adapterData: t.Optional[t.Dict[str, t.Any]] = None
    checksums: t.Optional[t.List['Checksum']] = None


class Checksum(BaseModel):
    """The checksum of an item calculated by the specified algorithm."""
    algorithm: Literal['MD5', 'SHA1', 'SHA256', 'timestamp', 'other']
    checksum: str


class ChecksumAlgorithm(BaseModel):
    """Names of checksum algorithms that may be supported by a debug adapter."""
    pass


class Breakpoint(BaseModel):
    """Information about a Breakpoint created in setBreakpoints or setFunctionBreakpoints."""
    id: t.Optional[int] = None
    verified: bool
    message: t.Optional[str] = None
    source: t.Optional[Source] = None
    line: t.Optional[int] = None
    column: t.Optional[int] = None
    endLine: t.Optional[int] = None
    endColumn: t.Optional[int] = None
    instructionReference: t.Optional[str] = None
    offset: t.Optional[int] = None


class BreakpointLocation(BaseModel):
    """Represents a single breakpoint location."""
    line: int
    column: t.Optional[int] = None
    endLine: t.Optional[int] = None
    endColumn: t.Optional[int] = None


class BreakpointMode(BaseModel):
    """A BreakpointMode is provided as a option when setting breakpoints on sources or instructions."""
    mode: str
    label: str
    description: t.Optional[str] = None
    appliesTo: t.List['BreakpointModeApplicability']


class BreakpointModeApplicability(BaseModel):
    """Describes one or more type of breakpoint a BreakpointMode applies to."""
    pass


class Capabilities(BaseModel):
    """Information about the capabilities of a debug adapter."""
    supportsConfigurationDoneRequest: t.Optional[bool] = None
    supportsFunctionBreakpoints: t.Optional[bool] = None
    supportsConditionalBreakpoints: t.Optional[bool] = None
    supportsHitConditionalBreakpoints: t.Optional[bool] = None
    supportsEvaluateForHovers: t.Optional[bool] = None
    exceptionBreakpointFilters: t.Optional[t.List['ExceptionBreakpointsFilter']] = None
    supportsStepBack: t.Optional[bool] = None
    supportsSetVariable: t.Optional[bool] = None
    supportsRestartFrame: t.Optional[bool] = None
    supportsGotoTargetsRequest: t.Optional[bool] = None
    supportsStepInTargetsRequest: t.Optional[bool] = None
    supportsCompletionsRequest: t.Optional[bool] = None
    supportsModulesRequest: t.Optional[bool] = None
    additionalModuleColumns: t.Optional[t.List['ColumnDescriptor']] = None
    supportedChecksumAlgorithms: t.Optional[t.List[ChecksumAlgorithm]] = None
    supportsRestartRequest: t.Optional[bool] = None
    supportsExceptionOptions: t.Optional[bool] = None
    supportsValueFormattingOptions: t.Optional[bool] = None
    supportsExceptionInfoRequest: t.Optional[bool] = None
    supportTerminateDebuggee: t.Optional[bool] = None
    supportSuspendDebuggee: t.Optional[bool] = None
    supportsDelayedStackTraceLoading: t.Optional[bool] = None
    supportsLoadedSourcesRequest: t.Optional[bool] = None
    supportsLogPoints: t.Optional[bool] = None
    supportsTerminateThreadsRequest: t.Optional[bool] = None
    supportsSetExpression: t.Optional[bool] = None
    supportsTerminateRequest: t.Optional[bool] = None
    supportsDataBreakpoints: t.Optional[bool] = None
    supportsReadMemoryRequest: t.Optional[bool] = None
    supportsWriteMemoryRequest: t.Optional[bool] = None
    supportsDisassembleRequest: t.Optional[bool] = None
    supportsCancelRequest: t.Optional[bool] = None
    supportsBreakpointLocationsRequest: t.Optional[bool] = None
    supportsClipboardContext: t.Optional[bool] = None
    supportsSteppingGranularity: t.Optional[bool] = None
    supportsInstructionBreakpoints: t.Optional[bool] = None
    supportsExceptionFilterOptions: t.Optional[bool] = None
    supportsSingleThreadExecutionRequests: t.Optional[bool] = None


class ColumnDescriptor(BaseModel):
    """A ColumnDescriptor specifies what module attribute to use for a column."""
    attributeName: str
    label: str
    format: t.Optional[str] = None
    type: t.Optional[str] = None
    width: t.Optional[int] = None


class CompletionItem(BaseModel):
    """Represents a single completion item."""
    label: str
    text: t.Optional[str] = None
    sortText: t.Optional[str] = None
    detail: t.Optional[str] = None
    type: t.Optional['CompletionItemType'] = None
    start: t.Optional[int] = None
    length: t.Optional[int] = None
    selectionStart: t.Optional[int] = None
    selectionLength: t.Optional[int] = None


class CompletionItemType(BaseModel):
    """Some predefined types for the CompletionItem."""
    pass


class DataBreakpoint(BaseModel):
    """Properties of a data breakpoint passed to the setDataBreakpoints request."""
    dataId: str
    accessType: t.Optional['DataBreakpointAccessType'] = None
    condition: t.Optional[str] = None
    hitCondition: t.Optional[str] = None


class DataBreakpointAccessType(BaseModel):
    """This enumeration defines all possible access types for data breakpoints."""
    pass


class DisassembledInstruction(BaseModel):
    """Represents a single disassembled instruction."""
    address: str
    instructionBytes: t.Optional[str] = None
    instruction: str
    symbol: t.Optional[str] = None
    location: t.Optional[Source] = None
    line: t.Optional[int] = None
    column: t.Optional[int] = None
    endLine: t.Optional[int] = None
    endColumn: t.Optional[int] = None


class ExceptionBreakpointsFilter(BaseModel):
    """An ExceptionBreakpointsFilter is shown in the UI as an option for configuring how exceptions are dealt with."""
    filter: str
    label: str
    description: t.Optional[str] = None
    default: t.Optional[bool] = None
    supportsCondition: t.Optional[bool] = None
    conditionDescription: t.Optional[str] = None


class ExceptionDetails(BaseModel):
    """Detailed information about an exception that has occurred."""
    message: t.Optional[str] = None
    typeName: t.Optional[str] = None
    fullTypeName: t.Optional[str] = None
    evaluateName: t.Optional[str] = None
    stackTrace: t.Optional[str] = None
    innerException: t.Optional[t.List['ExceptionDetails']] = None


class ExceptionFilterOptions(BaseModel):
    """An ExceptionFilterOptions is used to specify an exception filter together with a condition for the setExceptionBreakpoints request."""
    filterId: str
    condition: t.Optional[str] = None
    mode: t.Optional[str] = None


class ExceptionOptions(BaseModel):
    """An ExceptionOptions assigns configuration options to a set of exceptions."""
    path: t.Optional[t.List['ExceptionPathSegment']] = None
    breakMode: 'ExceptionBreakMode'


class ExceptionBreakMode(BaseModel):
    """This enumeration defines all possible conditions when a thrown exception should result in a break."""
    pass


class ExceptionPathSegment(BaseModel):
    """An ExceptionPathSegment represents a segment in a path that is used to match leafs or nodes in a tree of exceptions."""
    negate: t.Optional[bool] = None
    names: t.List[str]


class FunctionBreakpoint(BaseModel):
    """Properties of a breakpoint passed to the setFunctionBreakpoints request."""
    name: str
    condition: t.Optional[str] = None
    hitCondition: t.Optional[str] = None


class GotoTarget(BaseModel):
    """A GotoTarget describes a code location that can be used as a target in the 'goto' request."""
    id: int
    label: str
    line: int
    column: t.Optional[int] = None
    endLine: t.Optional[int] = None
    endColumn: t.Optional[int] = None
    instructionPointerReference: t.Optional[str] = None


class InstructionBreakpoint(BaseModel):
    """Properties of a breakpoint passed to the setInstructionBreakpoints request."""
    instructionReference: str
    offset: t.Optional[int] = None
    condition: t.Optional[str] = None
    hitCondition: t.Optional[str] = None


class InvalidatedAreas(BaseModel):
    """Logical areas that can be invalidated by the 'invalidated' event."""
    pass


class Module(BaseModel):
    """A Module object represents a row in the modules view."""
    id: t.Union[int, str]
    name: str
    path: t.Optional[str] = None
    isOptimized: t.Optional[bool] = None
    version: t.Optional[str] = None
    symbolStatus: t.Optional[str] = None
    symbolFilePath: t.Optional[str] = None
    dateTimeStamp: t.Optional[str] = None
    addressRange: t.Optional[str] = None


class Scope(BaseModel):
    """A Scope is a named container for variables."""
    name: str
    presentationHint: t.Optional[Literal['arguments', 'locals', 'registers']] = None
    variablesReference: int
    namedVariables: t.Optional[int] = None
    indexedVariables: t.Optional[int] = None
    expensive: t.Optional[bool] = None
    source: t.Optional[Source] = None
    line: t.Optional[int] = None
    column: t.Optional[int] = None
    endLine: t.Optional[int] = None
    endColumn: t.Optional[int] = None


class SourceBreakpoint(BaseModel):
    """Properties of a breakpoint or logpoint passed to the setBreakpoints request."""
    line: int
    column: t.Optional[int] = None
    condition: t.Optional[str] = None
    hitCondition: t.Optional[str] = None
    logMessage: t.Optional[str] = None


class StackFrame(BaseModel):
    """A Stackframe contains the source location."""
    id: int
    name: str
    source: t.Optional[Source] = None
    line: int
    column: int
    endLine: t.Optional[int] = None
    endColumn: t.Optional[int] = None
    canRestart: t.Optional[bool] = None
    instructionPointerReference: t.Optional[str] = None
    moduleId: t.Optional[t.Union[int, str]] = None
    presentationHint: t.Optional[Literal['normal', 'label', 'subtle']] = None


class StackFrameFormat(BaseModel):
    """Provides formatting information for a stack frame."""
    parameters: t.Optional[bool] = None
    parameterTypes: t.Optional[bool] = None
    parameterNames: t.Optional[bool] = None
    parameterValues: t.Optional[bool] = None
    line: t.Optional[bool] = None
    module: t.Optional[bool] = None
    includeAll: t.Optional[bool] = None


class StepInTarget(BaseModel):
    """A StepInTarget can be used in the 'stepIn' request and identifies an element that can be stepped into."""
    id: int
    label: str


class SteppingGranularity(BaseModel):
    """This enumeration defines all possible stepping granularities."""
    pass


class Thread(BaseModel):
    """A Thread."""
    id: int
    name: str


class ValueFormat(BaseModel):
    """Provides formatting information for a value."""
    hex: t.Optional[bool] = None


class Variable(BaseModel):
    """A Variable is a name/value pair."""
    name: str
    value: str
    type: t.Optional[str] = None
    presentationHint: t.Optional['VariablePresentationHint'] = None
    evaluateName: t.Optional[str] = None
    variablesReference: int
    namedVariables: t.Optional[int] = None
    indexedVariables: t.Optional[int] = None
    memoryReference: t.Optional[str] = None


class VariablePresentationHint(BaseModel):
    """Optional properties of a variable that can be used to determine how to render the variable in the UI."""
    kind: t.Optional[Literal['property', 'method', 'class', 'data', 'event', 'baseClass', 'innerClass', 'interface', 'mostDerivedClass', 'virtual', 'dataBreakpoint']] = None
    attributes: t.Optional[t.List[Literal['static', 'constant', 'readOnly', 'rawString', 'hasObjectId', 'canHaveObjectId', 'hasSideEffects', 'hasDataBreakpoint']]] = None
    visibility: t.Optional[Literal['public', 'private', 'protected', 'internal', 'final']] = None
    lazy: t.Optional[bool] = None


# Update forward references
Source.model_rebuild()
Breakpoint.model_rebuild()
BreakpointMode.model_rebuild()
ExceptionDetails.model_rebuild()
ExceptionOptions.model_rebuild()
Variable.model_rebuild()
