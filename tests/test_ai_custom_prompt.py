import os
import tempfile
from unittest.mock import MagicMock, patch
from biscuit.common.ai.agent import Agent

def test_custom_system_prompts():
    base = MagicMock()
    with tempfile.TemporaryDirectory() as tmpdir:
        biscuit_dir = os.path.join(tmpdir, ".biscuit")
        os.makedirs(biscuit_dir)
        with open(os.path.join(biscuit_dir, "instructions.md"), "w", encoding="utf-8") as f:
            f.write("Always write Python 3.12 syntax.")

        base.active_directory = tmpdir
        base.config.get_nested.return_value = "Always be polite."
        
        with patch("biscuit.common.ai.agent.resolve"):
            agent = Agent(base, "key", "test-model")
            proj_inst = agent._get_project_instructions()
            assert "Always be polite." in proj_inst
            assert "Always write Python 3.12 syntax." in proj_inst
