/** Detect phone/tablet layout — works on iPhone even with coarse pointer. */
export function isMobileLayout(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 768px)").matches ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches
  );
}
