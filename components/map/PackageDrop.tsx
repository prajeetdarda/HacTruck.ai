"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const PARACHUTE_SRC = "/markers/package-parachute-v2.png";
const PACKAGE_SRC = "/markers/package.png";

/** Falling animation — shows parachute during drop, swaps to plain package on landing. */
export function PackageDrop({
  loadId,
}: {
  loadId: string;
}) {
  const [landed, setLanded] = useState(false);

  return (
    <div
      className="pointer-events-none absolute bottom-1/2 left-1/2 z-20 -translate-x-1/2"
      aria-hidden
    >
      <AnimatePresence mode="wait">
        {!landed ? (
          <motion.div
            key={`drop-${loadId}`}
            initial={{ y: -160, rotate: -6, scale: 0.94 }}
            animate={{ y: 0, rotate: 3, scale: 1 }}
            transition={{
              y: { type: "spring", stiffness: 75, damping: 11 },
              rotate: { duration: 1.15, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
            }}
            onAnimationComplete={() => setLanded(true)}
          >
            <PackageArt src={PARACHUTE_SRC} size={64} />
          </motion.div>
        ) : (
          <motion.div
            key={`landed-${loadId}`}
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <PackageArt src={PACKAGE_SRC} size={34} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Static mini icon shown on the pin after the drop lands. */
export function PackagePinIcon({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span className={className} aria-hidden>
      <PackageArt src={PACKAGE_SRC} size={size} />
    </span>
  );
}

function PackageArt({ src, size }: { src: string; size: number }) {
  return (
    <span
      className="relative block"
      style={{
        width: size,
        height: size,
      }}
    >
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        unoptimized
        sizes={`${size}px`}
        className="pointer-events-none select-none object-contain object-center"
        style={{
          filter:
            "drop-shadow(0 2px 4px rgba(15, 23, 42, 0.2)) drop-shadow(0 8px 12px rgba(15, 23, 42, 0.14))",
        }}
      />
    </span>
  );
}
