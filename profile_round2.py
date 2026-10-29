"""Profile round 2 - identify next optimization targets."""
import os
import sys
import time
import cProfile
import pstats
import tkinter as tk
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

# Set environment
os.environ['ENVIRONMENT'] = 'test'
os.environ['PYTHONPATH'] = str(Path(__file__).parent / 'src')

def profile_editor_operations():
    """Profile common editor operations to find bottlenecks."""
    from biscuit import App
    
    app = App()
    app.update()
    time.sleep(0.5)
    
    # Create a test file
    test_file = Path('test_perf.py')
    with open(test_file, 'w') as f:
        for i in range(5000):
            f.write(f"def function_{i}(x, y):\n")
            f.write(f"    return x + y + {i}\n\n")
    
    try:
        # Open the file
        app.editorsmanager.open_editor(str(test_file.absolute()))
        app.update()
        time.sleep(1)  # Let everything settle
        
        editor = app.editorsmanager.active_editor
        text = editor.content.text
        
        print("=" * 80)
        print("BASELINE MEASUREMENTS")
        print("=" * 80)
        
        # 1. Measure typing latency
        print("\n1. Typing latency (20 chars):")
        times = []
        for i in range(20):
            start = time.perf_counter()
            text.insert(tk.END, "a")
            app.update()
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.2f}ms")
        print(f"   Min: {min(times):.2f}ms, Max: {max(times):.2f}ms")
        
        # 2. Measure refresh() time
        print("\n2. refresh() latency (10 calls):")
        times = []
        for _ in range(10):
            start = time.perf_counter()
            text.refresh()
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.2f}ms")
        print(f"   Min: {min(times):.2f}ms, Max: {max(times):.2f}ms")
        
        # 3. Profile get_all_text()
        print("\n3. get_all_text() latency (10 calls):")
        times = []
        for _ in range(10):
            start = time.perf_counter()
            _ = text.get_all_text()
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.2f}ms")
        print(f"   Min: {min(times):.2f}ms, Max: {max(times):.2f}ms")
        
        # 4. Profile indent guide updates
        print("\n4. update_indent_guides() latency (10 calls):")
        if hasattr(text, 'update_indent_guides'):
            times = []
            for _ in range(10):
                start = time.perf_counter()
                text.update_indent_guides()
                elapsed = time.perf_counter() - start
                times.append(elapsed * 1000)
            print(f"   Mean: {sum(times)/len(times):.2f}ms")
            print(f"   Min: {min(times):.2f}ms, Max: {max(times):.2f}ms")
        else:
            print("   Method not found")
        
        # 5. Profile minimap redraw
        print("\n5. minimap.redraw() latency (5 calls):")
        if hasattr(editor, 'minimap') and editor.minimap:
            times = []
            for _ in range(5):
                start = time.perf_counter()
                editor.minimap.redraw()
                elapsed = time.perf_counter() - start
                times.append(elapsed * 1000)
            print(f"   Mean: {sum(times)/len(times):.2f}ms")
            print(f"   Min: {min(times):.2f}ms, Max: {max(times):.2f}ms")
        else:
            print("   Minimap not available")
        
        # 6. Profile scrolling
        print("\n6. Scroll event latency (10 events):")
        times = []
        for i in range(10):
            start = time.perf_counter()
            text.yview_scroll(1, "units")
            app.update()
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.2f}ms")
        print(f"   Min: {min(times):.2f}ms, Max: {max(times):.2f}ms")
        
        # 7. Full profile of refresh()
        print("\n" + "=" * 80)
        print("DETAILED PROFILE OF refresh()")
        print("=" * 80)
        pr = cProfile.Profile()
        pr.enable()
        for _ in range(5):
            text.refresh()
        pr.disable()
        
        s = pstats.Stats(pr)
        s.sort_stats('cumulative')
        s.print_stats(30)
        
        # 8. Full profile of typing
        print("\n" + "=" * 80)
        print("DETAILED PROFILE OF TYPING")
        print("=" * 80)
        pr2 = cProfile.Profile()
        pr2.enable()
        for _ in range(10):
            text.insert(tk.END, "x")
            app.update()
        pr2.disable()
        
        s2 = pstats.Stats(pr2)
        s2.sort_stats('cumulative')
        s2.print_stats(30)
        
    finally:
        app.destroy()
        if test_file.exists():
            test_file.unlink()

if __name__ == '__main__':
    profile_editor_operations()
