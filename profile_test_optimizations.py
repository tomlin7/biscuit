"""Profile round 3 - test optimizations."""
import os
import sys
import time
import tkinter as tk
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'src'))
os.environ['ENVIRONMENT'] = 'test'

def profile_editor_operations():
    """Profile common editor operations to find bottlenecks."""
    from biscuit import App
    
    app = App()
    app.update()
    time.sleep(0.5)
    
    # Create a test file
    test_file = Path('test_perf2.py')
    with open(test_file, 'w') as f:
        for i in range(5000):
            f.write(f"def function_{i}(x, y):\n")
            f.write(f"    return x + y + {i}\n\n")
    
    try:
        # Open the file
        app.editorsmanager.open_editor(str(test_file.absolute()))
        app.update()
        time.sleep(1)
        
        editor = app.editorsmanager.active_editor
        text = editor.content.text
        
        print("=" * 80)
        print("TESTING OPTIMIZATIONS")
        print("=" * 80)
        
        # Test incremental highlighting
        print("\n1. Testing incremental highlighting:")
        print(f"   Initial tree: {text.highlighter.ts.tree is not None}")
        
        # Do a single character insert and check if incremental works
        text.mark_set('insert', '1.0')
        text.insert('insert', 'x')
        app.update()
        time.sleep(0.2)
        
        print(f"   After insert - pending edits: {len(text._pending_edit_infos)}")
        print(f"   Force full: {text._force_full_highlight}")
        
        # Manual refresh to see what happens
        start = time.perf_counter()
        text.refresh()
        elapsed = time.perf_counter() - start
        print(f"   Manual refresh time: {elapsed*1000:.2f}ms")
        
        # Test typing latency
        print("\n2. Testing typing latency (10 chars):")
        times = []
        for i in range(10):
            start = time.perf_counter()
            text.insert(tk.END, "a")
            app.update()
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.2f}ms")
        print(f"   Min: {min(times):.2f}ms, Max: {max(times):.2f}ms")
        
    finally:
        app.destroy()
        if test_file.exists():
            test_file.unlink()

if __name__ == '__main__':
    profile_editor_operations()
