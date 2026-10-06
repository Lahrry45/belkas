"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/** Swipeable (scroll-snap) gallery with dots; works with touch, trackpad and arrow buttons. */
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const go = (i: number) => ref.current?.scrollTo({ left: i * ref.current.clientWidth, behavior: "smooth" });

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto sm:mx-0"
      >
        {images.map((src, i) => (
          <div key={src} className="relative aspect-square w-full shrink-0 snap-center bg-sand">
            <Image src={src} alt={`${alt}, photo ${i + 1}`} fill loading={(i === 0) ? "eager" : "lazy"} fetchPriority={(i === 0) ? "high" : "auto"} sizes="(min-width: 768px) 55vw, 100vw" quality={75} className="object-cover" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <div className="mt-3 flex justify-center gap-2">
            {images.map((_, i) => (
              <button key={i} aria-label={`Show photo ${i + 1}`} onClick={() => go(i)} className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-ink" : "w-1.5 bg-line"}`} />
            ))}
          </div>
          <button aria-label="Previous photo" onClick={() => go(Math.max(0, index - 1))} className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 sm:grid place-items-center">‹</button>
          <button aria-label="Next photo" onClick={() => go(Math.min(images.length - 1, index + 1))} className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 sm:grid place-items-center">›</button>
        </>
      )}
    </div>
  );
}
