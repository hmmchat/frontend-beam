import clsx from "clsx";

/** One indicator per photo: none for 1, two for 2, three for 3. */
export default function FacecardPhotoDots({ count, activeIndex, className }) {
  if (count <= 1) return null;
  return (
    <div
      data-facecard-pagination="true"
      className={clsx(
        "absolute bottom-3 left-0 right-0 z-20 flex items-center justify-center gap-1 pointer-events-none",
        className,
      )}
    >
      {Array.from({ length: count }, (_, idx) => (
        <div
          key={idx}
          className={clsx(
            "rounded-[9px] bg-white transition-all duration-300",
            idx === activeIndex ? "h-[3px] w-[10px]" : "h-[3px] w-[3px] opacity-90",
          )}
        />
      ))}
    </div>
  );
}
