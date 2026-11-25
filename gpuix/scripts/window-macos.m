#import <Cocoa/Cocoa.h>
#include <stdbool.h>
#include <stdatomic.h>
#include <math.h>

// GPUI delivers input to JS asynchronously. Retain the original AppKit event,
// then enter the OS tracking loop asynchronously so JS never waits for a drag.
static NSEvent *dragMouseDown;
static NSUInteger dragGeneration;
static atomic_bool dragActive = false;
#ifdef HIROSHI_WINDOW_TEST
static NSUInteger testButtons;
static dispatch_block_t testDragTask;
#endif
static NSUInteger dragButtons(void) {
#ifdef HIROSHI_WINDOW_TEST
  return testButtons;
#else
  return NSEvent.pressedMouseButtons;
#endif
}
static void recordDragEvent(NSEvent *event) {
  dragGeneration++;
  dragMouseDown = nil;
  if (event.type == NSEventTypeLeftMouseDown && event.clickCount == 1 &&
      [event.window.title isEqualToString:@"Hiroshi · Multi-Agent Orchestrator"] &&
      [NSApp.windows containsObject:event.window]) dragMouseDown = event;
}

static NSMutableArray<NSString *> *pendingLinks;
@interface HiroshiLinks : NSObject
- (void)openURL:(NSAppleEventDescriptor *)event reply:(NSAppleEventDescriptor *)reply;
@end
@implementation HiroshiLinks
- (void)openURL:(NSAppleEventDescriptor *)event reply:(NSAppleEventDescriptor *)reply {
  NSString *url = [event paramDescriptorForKeyword:keyDirectObject].stringValue;
  if (url && pendingLinks.count < 32) [pendingLinks addObject:url];
}
@end

static NSWindow *hiroshiWindow(void) {
  for (NSWindow *window in NSApp.windows)
    if ([window.title isEqualToString:@"Hiroshi · Multi-Agent Orchestrator"]) return window;
  return nil;
}
static void onMain(void (^work)(void)) {
  if (NSThread.isMainThread) work(); else dispatch_sync(dispatch_get_main_queue(), work);
}
void hiroshi_drag_install(void) {
  onMain(^{
    static id monitor;
    if (!monitor) monitor = [NSEvent addLocalMonitorForEventsMatchingMask:NSEventMaskLeftMouseDown | NSEventMaskLeftMouseUp handler:^NSEvent *(NSEvent *event) {
      recordDragEvent(event);
      return event; // Controls and GPUI hit-testing still receive the event.
    }];
  });
}
bool hiroshi_drag_active(void) { return atomic_load(&dragActive); }
bool hiroshi_drag_start(double x, double y) {
  __block bool accepted = false;
  onMain(^{
    NSEvent *event = dragMouseDown;
    NSWindow *window = event.window;
    NSTimeInterval age = NSProcessInfo.processInfo.systemUptime - event.timestamp;
    if (!event || atomic_load(&dragActive) || !(dragButtons() & 1) || age < 0 || age > 1 ||
        !isfinite(x) || !isfinite(y) || !window.visible || ![NSApp.windows containsObject:window]) return;
    NSView *view = window.contentView;
    NSPoint point = [view convertPoint:event.locationInWindow fromView:nil];
    double top = view.isFlipped ? point.y - NSMinY(view.bounds) : NSMaxY(view.bounds) - point.y;
    if (fabs(point.x - NSMinX(view.bounds) - x) > 3 || fabs(top - y) > 3) return;
    NSUInteger generation = dragGeneration;
    dragMouseDown = nil; // A native press can authorize only one drag.
    accepted = true;
    atomic_store(&dragActive, true);
    dispatch_block_t task = ^{
      @try {
        if (generation == dragGeneration && (dragButtons() & 1) && window.visible && [NSApp.windows containsObject:window])
          [window performWindowDragWithEvent:event];
      } @catch (NSException *exception) {
        NSLog(@"Hiroshi: window drag rejected: %@", exception.reason);
      } @finally { atomic_store(&dragActive, false); }
    };
#ifdef HIROSHI_WINDOW_TEST
    testDragTask = task;
#else
    dispatch_async(dispatch_get_main_queue(), task);
#endif
  });
  return accepted;
}
void hiroshi_links_install(void) {
  onMain(^{
    static HiroshiLinks *handler;
    if (handler) return;
    pendingLinks = [NSMutableArray new]; handler = [HiroshiLinks new];
    [NSAppleEventManager.sharedAppleEventManager setEventHandler:handler andSelector:@selector(openURL:reply:) forEventClass:kInternetEventClass andEventID:kAEGetURL];
  });
}
bool hiroshi_link_next(char *buffer, unsigned capacity) {
  __block bool found = false;
  onMain(^{
    if (!pendingLinks.count) return;
    NSString *url = pendingLinks.firstObject; [pendingLinks removeObjectAtIndex:0];
    if (strlen(url.UTF8String) >= capacity) return;
    strcpy(buffer, url.UTF8String); found = true;
  });
  return found;
}
bool hiroshi_window_read(double *out) {
  __block bool found = false;
  onMain(^{
    NSWindow *window = hiroshiWindow();
    if (!window || window.miniaturized) return;
    NSRect frame = window.frame;
    out[0] = frame.origin.x; out[1] = frame.origin.y;
    out[2] = frame.size.width; out[3] = frame.size.height;
    out[4] = [window.screen.deviceDescription[@"NSScreenNumber"] doubleValue];
    out[5] = window.zoomed; found = true;
  });
  return found;
}
bool hiroshi_window_restore(double *values) {
  // Copy before dispatch: JS owns the supplied memory.
  double x=values[0], y=values[1], width=values[2], height=values[3], display=values[4], zoom=values[5];
  __block bool found = false;
  onMain(^{
    NSWindow *window = hiroshiWindow(); if (!window) return;
    NSScreen *screen = NSScreen.mainScreen;
    for (NSScreen *candidate in NSScreen.screens)
      if ([candidate.deviceDescription[@"NSScreenNumber"] doubleValue] == display) screen = candidate;
    NSRect area = screen.visibleFrame;
    double w = MIN(MAX(width, 700), area.size.width), h = MIN(MAX(height, 500), area.size.height);
    double px = MIN(MAX(x, area.origin.x), NSMaxX(area)-w), py = MIN(MAX(y, area.origin.y), NSMaxY(area)-h);
    [window setFrame:NSMakeRect(px, py, w, h) display:YES];
    if (zoom && !window.zoomed) [window zoom:nil];
    found = true;
  });
  return found;
}
