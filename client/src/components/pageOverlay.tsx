"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ENTER animation
    gsap.fromTo(
      el.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );

    return () => {
      // EXIT animation
      gsap.to(el.current, {
        opacity: 0,
        y: -20,
        duration: 0.3,
        ease: "power2.in",
      });
    };
  }, []);

  return <div ref={el}>{children}</div>;
}