from __future__ import annotations
import asyncio
import functools
import typing

async def retry_with_backoff(coro_fn, max_retries: int = 3, base_delay: float = 0.1):
    delay = base_delay
    last_err = None
    for attempt in range(max_retries):
        try:
            return await coro_fn()
        except Exception as e:
            last_err = e
            is_429 = "429" in str(e) or getattr(getattr(e, "response", None), "status_code", None) == 429
            if not is_429 or attempt == max_retries - 1:
                raise
            await asyncio.sleep(delay)
            delay *= 2
    if last_err:
        raise last_err
