export function markerCountsForLanguage(
  language: string,
  markers: Array<{ owner: string }>,
): number {
  const acceptsTypescript = language === "typescript" || language === "javascript";
  return markers.filter((marker) => {
    const owner = marker.owner.toLowerCase();
    if (
      !acceptsTypescript &&
      (owner.includes("typescript") || owner.includes("javascript") || owner === "ts")
    ) {
      return false;
    }
    return true;
  }).length;
}

export function keepMarker(language: string, owner: string): boolean {
  return markerCountsForLanguage(language, [{ owner }]) === 1;
}
