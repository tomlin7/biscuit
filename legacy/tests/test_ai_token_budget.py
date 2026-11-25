from biscuit.common.ai.token_tracker import TokenTracker

def test_token_tracker_and_budget():
    tracker = TokenTracker(budget_tokens=1000)
    tracker.record_usage(400, 300)
    assert tracker.total_tokens == 700
    assert tracker.is_budget_exceeded is False
    assert tracker.get_summary() == "700/1000 tokens"

    tracker.record_usage(200, 200)
    assert tracker.total_tokens == 1100
    assert tracker.is_budget_exceeded is True
