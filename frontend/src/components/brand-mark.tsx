import { cn } from "@/lib/utils";

/* The house mark: a rain drop whose interior resolves into a rising bar chart —
   weather becoming data. Geometry is the logo's own, refitted to a 24 grid so it
   carries the same optical weight as the lucide icons it shares a row with.

   Stroked in currentColor, never its own fill: the lockup sets the colour and the
   mark inherits it. See brand-lockup.tsx for the sizes and stroke weights it is
   rendered at — strokeWidth is a prop because the mark shares rows with lucide
   icons, and an icon holds its stroke near 2px rather than scaling it.

   The bars stop on the ring's centre line instead of being clipped to the drop's
   silhouette. A clipPath needs an id, and a single page can render six lockups —
   duplicate ids. The ring's own stroke covers the cut, so the shape is identical
   without one: IoU 0.978 against the 512-unit master in public/brand. */
export function BrandMark({
  className,
  strokeWidth = 1.75,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("h-5 w-5", className)}
    >
      <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="miter">
        <path d="M12 3.167L17.274 8.441A7.459 7.459 0 1 1 6.726 8.441Z" />
        <path d="M4.961 16.183H11.434M10.609 12.769V21.044M9.783 13.594H15.301M14.476 9.832V20.752M13.65 10.658H18.803" />
      </g>
    </svg>
  );
}
