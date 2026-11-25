// Test the production bridge with AppKit-shaped objects. No window, event tap,
// accessibility permission or physical mouse input is needed on a hosted runner.
#define HIROSHI_WINDOW_TEST 1
#import "window-macos.m"
#include <assert.h>

@interface DragTestView : NSObject
@property BOOL flipped;
- (NSRect)bounds;
- (BOOL)isFlipped;
- (NSPoint)convertPoint:(NSPoint)point fromView:(NSView *)view;
@end
@implementation DragTestView
- (NSRect)bounds { return NSMakeRect(0, 0, 800, 600); }
- (BOOL)isFlipped { return self.flipped; }
- (NSPoint)convertPoint:(NSPoint)point fromView:(NSView *)view { return point; }
@end
@interface DragTestWindow : NSObject
@property(strong) NSString *title;
@property(strong) NSView *contentView;
@property BOOL visible;
@property NSUInteger calls;
@property(strong) NSEvent *lastEvent;
- (BOOL)isVisible;
- (void)performWindowDragWithEvent:(NSEvent *)event;
@end
@implementation DragTestWindow
- (BOOL)isVisible { return self.visible; }
- (void)performWindowDragWithEvent:(NSEvent *)event { self.calls++; self.lastEvent = event; }
@end
@interface DragTestEvent : NSObject
@property NSEventType type;
@property NSInteger clickCount;
@property NSTimeInterval timestamp;
@property NSPoint locationInWindow;
@property(strong) NSWindow *window;
@end
@implementation DragTestEvent @end
@interface DragTestApplication : NSObject
@property(strong) NSArray *windows;
@end
@implementation DragTestApplication @end

int main(void) {
  @autoreleasepool {
    DragTestApplication *app = [DragTestApplication new];
    NSApp = (NSApplication *)(id)app;
    DragTestWindow *window = [DragTestWindow new];
    DragTestView *view = [DragTestView new];
    window.title = @"Hiroshi · Multi-Agent Orchestrator";
    window.contentView = (NSView *)(id)view; window.visible = YES;
    app.windows = @[window];
    DragTestEvent *event = [DragTestEvent new];
    event.window = (NSWindow *)(id)window; event.type = NSEventTypeLeftMouseDown;
    event.clickCount = 1; event.timestamp = NSProcessInfo.processInfo.systemUptime;
    event.locationInWindow = NSMakePoint(100, 500); testButtons = 1;
    NSEvent *nativeEvent = (NSEvent *)(id)event;
    recordDragEvent(nativeEvent);
    assert(!hiroshi_drag_start(400, 100)); // Different GPUI press.
    assert(hiroshi_drag_start(100, 100));
    assert(hiroshi_drag_active() && window.calls == 0); // JS returns before tracking.
    assert(!hiroshi_drag_start(100, 100));
    testDragTask(); testDragTask = nil;
    assert(!hiroshi_drag_active() && window.calls == 1 && window.lastEvent == nativeEvent);
    assert(!hiroshi_drag_start(100, 100)); // Consumed native event.

    event.timestamp -= 2; recordDragEvent(nativeEvent);
    assert(!hiroshi_drag_start(100, 100));
    event.timestamp = NSProcessInfo.processInfo.systemUptime;
    event.type = NSEventTypeRightMouseDown; recordDragEvent(nativeEvent);
    assert(!hiroshi_drag_start(100, 100));
    event.type = NSEventTypeLeftMouseDown; event.clickCount = 2; recordDragEvent(nativeEvent);
    assert(!hiroshi_drag_start(100, 100));
    event.clickCount = 1; window.title = @"Other app"; recordDragEvent(nativeEvent);
    assert(!hiroshi_drag_start(100, 100));
    window.title = @"Hiroshi · Multi-Agent Orchestrator";
    recordDragEvent(nativeEvent); testButtons = 0;
    assert(!hiroshi_drag_start(100, 100)); testButtons = 1;

    recordDragEvent(nativeEvent); assert(hiroshi_drag_start(100, 100));
    testButtons = 0; testDragTask(); testDragTask = nil; // Release before the queued call.
    assert(!hiroshi_drag_active() && window.calls == 1); testButtons = 1;
    recordDragEvent(nativeEvent); assert(hiroshi_drag_start(100, 100));
    event.type = NSEventTypeLeftMouseUp; recordDragEvent(nativeEvent);
    testDragTask(); testDragTask = nil;
    assert(!hiroshi_drag_active() && window.calls == 1);

    event.type = NSEventTypeLeftMouseDown; recordDragEvent(nativeEvent);
    assert(hiroshi_drag_start(100, 100)); app.windows = @[];
    testDragTask(); testDragTask = nil;
    assert(!hiroshi_drag_active() && window.calls == 1); app.windows = @[window];
    window.visible = NO; recordDragEvent(nativeEvent);
    assert(!hiroshi_drag_start(100, 100)); window.visible = YES;
    view.flipped = YES; event.locationInWindow = NSMakePoint(100, 100);
    recordDragEvent(nativeEvent); assert(hiroshi_drag_start(100, 100));
    testDragTask(); testDragTask = nil;
    assert(window.calls == 2 && !hiroshi_drag_active());
    puts("macOS native drag bridge: event identity, coordinate conversion, ownership, stale/released/duplicate presses and async tracking passed");
  }
  return 0;
}
