"""Profile refresh() method overhead."""
import os
import sys
import time
import tkinter as tk
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'src'))
os.environ['ENVIRONMENT'] = 'test'

def profile_refresh_overhead():
    """Measure the overhead of every operation in refresh()."""
    from biscuit import App
    
    app = App()
    app.update()
    time.sleep(0.5)
    
    # Create a test file
    test_file = Path('test_refresh.py')
    with open(test_file, 'w') as f:
        for i in range(3000):
            f.write(f"def function_{i}(x, y):\n")
            f.write(f"    return x + y + {i}\n\n")
    
    try:
        app.editorsmanager.open_editor(str(test_file.absolute()))
        app.update()
        time.sleep(1)
        
        editor = app.editorsmanager.active_editor
        text = editor.content.text
        
        print("=" * 80)
        print("REFRESH METHOD OVERHEAD ANALYSIS")
        print("=" * 80)
        
        # 1. Measure highlight_current_word
        print("\n1. highlight_current_word() overhead (10 calls):")
        times = []
        for _ in range(10):
            start = time.perf_counter()
            text.highlight_current_word()
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.3f}ms")
        print(f"   Min: {min(times):.3f}ms, Max: {max(times):.3f}ms")
        
        # 2. Measure highlight_current_line
        print("\n2. highlight_current_line() overhead (10 calls):")
        times = []
        for _ in range(10):
            start = time.perf_counter()
            text.highlight_current_line()
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.3f}ms")
        print(f"   Min: {min(times):.3f}ms, Max: {max(times):.3f}ms")
        
        # 3. Measure highlight_current_brackets
        print("\n3. highlight_current_brackets() overhead (10 calls):")
        times = []
        for _ in range(10):
            start = time.perf_counter()
            text.highlight_current_brackets()
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.3f}ms")
        print(f"   Min: {min(times):.3f}ms, Max: {max(times):.3f}ms")
        
        # 4. Measure update_indent_guides
        print("\n4. update_indent_guides() overhead (10 calls):")
        times = []
        for _ in range(10):
            start = time.perf_counter()
            text.update_indent_guides()
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.3f}ms")
        print(f"   Min: {min(times):.3f}ms, Max: {max(times):.3f}ms")
        
        # 5. Measure update_whitespace
        print("\n5. update_whitespace() overhead (10 calls):")
        times = []
        for _ in range(10):
            start = time.perf_counter()
            text.update_whitespace()
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.3f}ms")
        print(f"   Min: {min(times):.3f}ms, Max: {max(times):.3f}ms")
        
        # 6. Measure the highlighting step
        print("\n6. highlighter.highlight() overhead (5 calls):")
        times = []
        for _ in range(5):
            start = time.perf_counter()
            text.highlighter.highlight()
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.1f}ms")
        print(f"   Min: {min(times):.1f}ms, Max: {max(times):.1f}ms")
        
        # 7. Measure incremental highlighting
        print("\n7. highlighter.incremental_highlight_many() overhead (5 calls):")
        # Create some mock edit infos
        edit_infos = [
            {
                "op": "insert",
                "start_byte": 100,
                "old_end_byte": 100,
                "new_end_byte": 101,
                "start_point": (9, 0),
                "old_end_point": (9, 0),
                "new_end_point": (9, 1),
            }
        ] * 5
        times = []
        for _ in range(5):
            start = time.perf_counter()
            text.highlighter.incremental_highlight_many(edit_infos)
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.1f}ms")
        print(f"   Min: {min(times):.1f}ms, Max: {max(times):.1f}ms")
        
        # 8. Measure request_outline (LSP)
        print("\n8. base.language_server_manager.request_outline() overhead (10 calls):")
        times = []
        for _ in range(10):
            start = time.perf_counter()
            text.base.language_server_manager.request_outline(text)
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.3f}ms")
        print(f"   Min: {min(times):.3f}ms, Max: {max(times):.3f}ms")
        
        # 9. Full refresh overhead
        print("\n9. Full refresh() overhead (5 calls):")
        times = []
        for _ in range(5):
            start = time.perf_counter()
            text.refresh()
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.1f}ms")
        print(f"   Min: {min(times):.1f}ms, Max: {max(times):.1f}ms")
        
    finally:
        app.destroy()
        if test_file.exists():
            test_file.unlink()

if __name__ == '__main__':
    profile_refresh_overhead()
