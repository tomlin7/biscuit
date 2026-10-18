from unittest.mock import MagicMock, patch
from biscuit.common.ai.agent import Agent

def test_agent_cancellation():
    base = MagicMock()
    with patch("biscuit.common.ai.agent.resolve"):
        agent = Agent(base, "key", "test-model")
        agent.is_running = True
        agent.is_aborted = False
        
        agent.stop_execution()
        assert agent.is_running is False
        assert agent.is_aborted is True
