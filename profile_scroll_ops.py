import sys
import time
import cProfile
import pstats
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))
os.environ['ENVIRONMENT'] = 'test'
os.environ['PYTHONPATH'] = str(Path(__file__).parent / 'src')

from biscuit import App

def profile_scroll():
    app = App()
    app.update()
    time.sleep(0.5)
    
    # Create a large test file
    test_file = Path("test_scroll_perf.py")
    with open(test_file, "w") as f:
        for i in range(10000):
            f.write(f"def function_{i}():\n")
            f.write(f"    return {i}\n\n")
    
    # Open the file
    app.editorsmanager.open_editor(str(test_file))
    app.update()
    time.sleep(2)
    
    # Get the active editor
    editor = app.editorsmanager.active_editor
    text = editor.content.text
    
    print("Profiling scroll operations...")
    print("=" * 80)
    
    # Profile a single scroll operation
    profiler = cProfile.Profile()
    profiler.enable()
    
    start = time.time()
    for _ in range(10):
        text.yview_scroll(100, "units")
        app.update()
    elapsed = time.time() - start
    
    profiler.disable()
    
    print(f"\nScroll latency (10 scrolls): {elapsed*1000:.2f}ms total, {elapsed*100:.2f}ms avg")
    print("\nDetailed profile:")
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(30)
    
    # Profile individual operations in on_scroll
    print("\n" + "=" * 80)
    print("Profiling individual on_scroll operations:")
    print("=" * 80)
    
    operations = [
        ("linenumbers.redraw()", lambda: editor.content.linenumbers.redraw()),
        ("sticky_scroll.update_sticky_headers()", lambda: editor.content.sticky_scroll.update_sticky_headers()),
        ("minimap.update_from_yview()", lambda: editor.content.minimap.update_from_yview(*text.yview())),
        ("text.update_indent_guides()", lambda: text.update_indent_guides()),
        ("text._reposition_blame_label()", lambda: text._reposition_blame_label()),
        ("text.update_whitespace()", lambda: text.update_whitespace()),
    ]
    
    for name, op in operations:
        times = []
        for _ in range(10):
            start = time.time()
            op()
            app.update()
            times.append((time.time() - start) * 1000)
        
        avg = sum(times) / len(times)
        print(f"{name:50s} {avg:8.3f}ms avg")
    
    # Cleanup
    test_file.unlink()
    app.destroy()

if __name__ == "__main__":
    profile_scroll()
