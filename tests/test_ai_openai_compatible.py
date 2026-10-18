from biscuit.common.ai.providers.openai_compatible import OpenAICompatibleProvider
from biscuit.common.ai.providers import resolve

def test_openai_compatible_provider():
    p = OpenAICompatibleProvider(api_key="sk-test", model="custom-model", base_url="http://vllm-server:8000/v1")
    assert p.base_url == "http://vllm-server:8000/v1"
    assert OpenAICompatibleProvider.supports_model("openai-compatible:my-custom-llm")
    assert p.supports_model("custom-model")
