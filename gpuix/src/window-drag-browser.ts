/** A canvas cannot move its browser window. No native FFI enters this build. */
export function startWindowDrag(..._args: unknown[]): boolean { return false }
export function updateWindowDrag(): void {}
export function endWindowDrag(): void {}
export function handleTitlebarMouseDown(..._args: unknown[]): void {}
export function isWindowMaximized(): boolean { return false }
export function toggleWindowZoom(..._args: unknown[]): boolean { return false }
