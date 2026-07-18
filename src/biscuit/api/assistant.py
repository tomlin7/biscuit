from .endpoint import Endpoint


class Assistant(Endpoint):
    """Assistant endpoint

    This class is used to interact with the assistant API.
    """

    def __init__(self, *a) -> None:
        super().__init__(*a)
        self.ai = self.base.ai

        self.get_agent = self._get_agent
        self.set_mode = self._set_mode
        self.attach_files = self._attach_files
        self.process_message = self._process_message
        self.set_model = self._set_model
        
    def _get_agent(self):
        """Get the current AI agent instance."""
        return getattr(self.ai, 'agent', None)
    
    def _set_mode(self, mode_name: str):
        """Set AI mode (Deprecated)."""
        return False
    
    def _attach_files(self, file_paths):
        if hasattr(self.ai, 'attach_file'):
            self.ai.attach_file(*file_paths)
            return True
        return False
    
    def _process_message(self, message: str):
        """Process a message through the AI agent."""
        agent = self._get_agent()
        if agent:
            return agent.process_message_sync(message)
        return "AI agent not available"
    
    def _set_model(self, model_name: str):
        """Set the AI model."""
        if model_name in self.ai.available_models:
            self.ai.set_current_model(model_name)
            return True
        return False
