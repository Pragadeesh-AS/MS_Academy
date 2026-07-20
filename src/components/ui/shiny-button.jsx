"use client";

import React from "react";
import { motion } from "framer-motion";

import { cn } from "../../lib/utils";

const animationProps = {
  initial: { "--x": "100%", scale: 1 },
  animate: { "--x": "-100%", scale: 1 },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: "loop",
    repeatDelay: 1,
    type: "spring",
    stiffness: 20,
    damping: 15,
    mass: 2,
    scale: {
      type: "spring",
      stiffness: 200,
      damping: 5,
      mass: 0.5,
    },
  },
};

export const ShinyButton = ({
  children,
  className,
  ...props
}) => {
  return (
    <motion.button
      {...animationProps}
      {...props}
      className={cn(
        "relative rounded-[inherit] overflow-hidden transition-shadow duration-300 ease-in-out hover:shadow",
        className
      )}
    >
      <span className="relative z-10 block size-full">
        {children}
      </span>
      
      {/* Surface Shine */}
      <span
        className="absolute inset-0 z-10 block rounded-[inherit] pointer-events-none"
        style={{
          background: "linear-gradient(-75deg, transparent calc(var(--x) + 15%), rgba(255,255,255,0.4) calc(var(--x) + 25%), transparent calc(var(--x) + 35%))",
        }}
      ></span>

      {/* Border Shine */}
      <span
        style={{
          mask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
        }}
        className="absolute inset-0 z-10 block rounded-[inherit] bg-[linear-gradient(-75deg,rgba(255,255,255,0.1)_calc(var(--x)+15%),rgba(255,255,255,0.8)_calc(var(--x)+25%),rgba(255,255,255,0.1)_calc(var(--x)+35%))] p-[2px] pointer-events-none"
      ></span>
    </motion.button>
  );
};
