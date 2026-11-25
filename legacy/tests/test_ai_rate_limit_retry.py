import pytest
from biscuit.common.ai.retry import retry_with_backoff

@pytest.mark.asyncio
async def test_retry_on_429():
    attempts = 0
    async def flaky_call():
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise RuntimeError("HTTP 429: Too Many Requests")
        return "success"

    res = await retry_with_backoff(flaky_call, max_retries=3, base_delay=0.01)
    assert res == "success"
    assert attempts == 3
