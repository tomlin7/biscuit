# Performance Optimization Plan

Based on profiling data, here are the optimizations to implement:

## Current Bottlenecks (5000-line file)
- refresh(): 1010ms (doing full highlight instead of incremental)
- sticky_scroll.update_scopes(): 110ms per keystroke
- linenumbers.update_folds(): 73ms per keystroke
- folding.compute_indent_folds(): 73ms per keystroke
- get_all_text(): 31ms per call
- Scroll events: 402ms

## Optimization Plan

### PR #7: perf-debounce-expensive-updates
Debounce sticky scroll, folding, and line number fold updates to 150ms.
These operations run on every keystroke but don't need to be synchronous.

### PR #8: perf-cache-text-operations
Cache get_all_text() results and invalidate on edit.
Reduces repeated calls from 31ms to ~0ms.

### PR #9: perf-visible-region-only
Only update visible regions for expensive operations.
For large files, don't process off-screen content until it's scrolled into view.

### PR #10: perf-batch-tag-operations
Batch tkinter tag operations to reduce IPC overhead.
Currently 275,930 tag_add calls per refresh.

## Expected Improvements
- Typing latency: 50ms -> <10ms
- Scroll latency: 402ms -> <50ms
- refresh(): 1010ms -> <100ms
