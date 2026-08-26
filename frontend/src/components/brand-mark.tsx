import { cn } from "@/lib/utils";

/* The house mark: a rain drop whose interior resolves into a rising bar chart —
   weather becoming data. Geometry is the logo's own, refitted to a 24 grid so it
   carries the same optical weight as the lucide icons it shares a row with.

   Stroked in currentColor, never its own fill: every lockup already sits inside a
   bg-brand-700 tile that sets the text colour, and the mark inherits it.

   The bars stop on the ring's centre line instead of being clipped to the drop's
   silhouette. A clipPath needs an id, and a single page can render six lockups —
   duplicate ids. The ring's own stroke covers the cut, so the shape is identical
   without one: IoU 0.978 against the 512-unit master in public/brand. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("h-5 w-5", className)}
    >
      <g stroke="currentColor" strokeWidth={1.65} strokeLinejoin="miter">
        <path d="M12 3.167L17.274 8.441A7.459 7.459 0 1 1 6.726 8.441Z" />
        <path d="M4.961 16.183H11.434M10.609 12.769V21.044M9.783 13.594H15.301M14.476 9.832V20.752M13.65 10.658H18.803" />
      </g>
    </svg>
  );
}
