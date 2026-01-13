'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Waves } from 'lucide-react';
import { useEffect } from 'react';

interface AuthTransitionProps {
  show: boolean;
  onComplete?: () => void;
}

export function SignInTransition({ show, onComplete }: AuthTransitionProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 2000); // Show for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-[var(--bg-base)]/95 backdrop-blur-md flex items-center justify-center z-[1000]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6"
          >
            {/* Animated Icon */}
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.1, 1.1, 1.1, 1]
              }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="relative"
            >
              <div className="absolute inset-0 bg-[#F97316] rounded-full blur-2xl opacity-50 animate-pulse" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-[#F97316] to-[#FB923C] rounded-full flex items-center justify-center shadow-2xl shadow-[#F97316]/50">
                <Sparkles className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
            </motion.div>

            {/* Welcome Message */}
            <div className="text-center space-y-2">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-3xl font-bold text-[var(--text-primary)]"
              >
                Welcome to FlowVault
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-sm text-[var(--text-secondary)]"
              >
                Preparing your workspace...
              </motion.p>
            </div>

            {/* Loading Dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, -8, 0],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                  className="w-2 h-2 bg-[#F97316] rounded-full"
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SignOutTransition({ show, onComplete }: AuthTransitionProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1500); // Show for 1.5 seconds
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-[var(--bg-base)]/95 backdrop-blur-md flex items-center justify-center z-[1000]"
        >
          <motion.div
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6"
          >
            {/* Animated Icon */}
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
              className="relative"
            >
              <div className="absolute inset-0 bg-[#F97316] rounded-full blur-2xl opacity-40" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-[#F97316] to-[#FB923C] rounded-full flex items-center justify-center shadow-2xl shadow-[#F97316]/30">
                <Waves className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
            </motion.div>

            {/* Farewell Message */}
            <div className="text-center space-y-2">
              <motion.h2
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-3xl font-bold text-[var(--text-primary)]"
              >
                See you next time!
              </motion.h2>
              <motion.p
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-[var(--text-secondary)]"
              >
                Signing you out securely...
              </motion.p>
            </div>

            {/* Ripple Effect */}
            <motion.div className="relative w-12 h-1 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-[#F97316] to-transparent"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
