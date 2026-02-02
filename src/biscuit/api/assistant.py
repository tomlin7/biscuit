from .endpoint import Endpoint


class Assistant(Endpoint):
    """Assistant endpoint

    This class is used to interact with the assistant API.
    """

    def __init__(self, *a) -> None:
        super().__init__(*a)
        self.ai = self.base.ai

        # Legacy compatibility (now deprecated)
        self.register_provider = self._register_provider
        
        # New agent functionality
        self.get_agent = self._get_agent
        self.set_mode = self._set_mode
        self.attach_files = self._attach_files
        self.process_message = self._process_message
        self.set_model = self._set_model
        
    def _register_provider(self, provider: str, model_name: str = None):
        """Register a new model provider (updated for LangChain)."""
        return self.ai.register_provider(provider, model_name)
        
    def _get_agent(self):
        """Get the current AI agent instance."""
        return getattr(self.ai, 'agent', None)
    
    def _set_mode(self, mode_name: str):
        """Set AI mode (Deprecated)."""
        return False
    
    def _attach_files(self, file_paths):
        """Attach files to the current conversation."""
        if self.ai.chat and hasattr(self.ai.chat, 'attach_file'):
            self.ai.chat.attach_file(*file_paths)
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
