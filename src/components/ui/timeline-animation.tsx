"use client";
import React from "react";
import { motion, useInView, Variants } from "motion/react";

export interface TimelineContentProps {
  as?: any;
  animationNum?: number;
  timelineRef?: React.RefObject<HTMLElement | null>;
  customVariants?: Variants;
  className?: string;
  children: React.ReactNode;
}

export const TimelineContent: React.FC<TimelineContentProps> = ({
  as = "div",
  animationNum = 0,
  timelineRef,
  customVariants,
  className = "",
  children,
}) => {
  const fallbackRef = React.useRef<HTMLDivElement>(null);
  const targetRef = timelineRef || fallbackRef;
  const isInView = useInView(targetRef, { once: true, margin: "-50px" });

  const defaultVariants: Variants = {
    hidden: { opacity: 0, y: -20, filter: "blur(10px)" },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.2,
        duration: 0.5,
      },
    }),
  };

  const Component = (motion as any)[as] || motion.div;

  return (
    <Component
      custom={animationNum}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={customVariants || defaultVariants}
      className={className}
    >
      {children}
    </Component>
  );
};

export const TimelineAnimation = TimelineContent;
export default TimelineContent;
