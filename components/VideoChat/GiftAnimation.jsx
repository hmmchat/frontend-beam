"use client";

import { useEffect } from "react";

export default function GiftAnimation({ gift, onComplete }) {
  useEffect(() => {
    return () => {};
  }, []);

  if (!gift) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[999] flex items-center justify-center">
      <div className="triangle-wrapper">
        <div className="triangle-item text-[60px]">{gift.img}</div>
      </div>
    </div>
  );
}
