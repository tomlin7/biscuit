"""
AI Modes for Biscuit Editor
===========================

This module defines different AI modes that provide varying levels of 
functionality and tool access.
"""

from enum import Enum
from typing import Any, Dict, List


class AIMode(Enum):
    """Different modes of AI operation."""
    
    CODING_AGENT = "coding_agent"
    ASK_MODE = "ask_mode"
    EDIT_MODE = "edit_mode"
