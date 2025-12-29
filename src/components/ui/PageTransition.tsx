'use client';

import { ReactNode } from 'react';
import { motion, Variants, BezierDefinition } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Define the easing as BezierDefinition for type safety
const ease: BezierDefinition = [0.25, 0.46, 0.45, 0.94];

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
    },
  },
};

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered children animation
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease,
    },
  },
};

export function StaggerContainer({ children, className = '' }: StaggerContainerProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// Fade In animation for individual elements
interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function FadeIn({ children, delay = 0, className = '', direction = 'up' }: FadeInProps) {
  const directionOffset = {
    up: { y: 8, x: 0 },
    down: { y: -8, x: 0 },
    left: { x: 8, y: 0 },
    right: { x: -8, y: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directionOffset[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: 0.32,
        delay,
        ease,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale in animation (for modals, popovers)
export function ScaleIn({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{
        duration: 0.2,
        ease,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
