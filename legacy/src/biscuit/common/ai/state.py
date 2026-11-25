from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import List, Optional


class AgentState(Enum):
    """Current state of the coding agent."""
    IDLE = "idle"
    THINKING = "thinking"
    PLANNING = "planning"
    SEARCHING = "searching"
    ANALYZING = "analyzing"
    EDITING = "editing"
    TESTING = "testing"
    REVIEWING = "reviewing"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class AgentStep:
    """Represents a single step in the agent's execution."""
    step_number: int
    state: AgentState
    action: str
    reasoning: str
    result: Optional[str] = None
    files_modified: Optional[List[str]] = None
    duration: float = 0.0
    
    def __post_init__(self):
        if self.files_modified is None:
            self.files_modified = []


@dataclass
class AgentTask:
    """Represents a complete task for the agent."""
    id: str
    description: str
    requirements: List[str]
    constraints: List[str]
    success_criteria: List[str]
    steps: List[AgentStep]
    status: AgentState
    start_time: float
    end_time: Optional[float] = None
    
    def __post_init__(self):
        if not self.steps:
            self.steps = []
