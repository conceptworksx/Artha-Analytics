"use client";

import { AnimatePresence } from "framer-motion";
import { BYOKCard } from "@/components/auth/BYOKCard";

interface BYOKModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BYOKModal({ isOpen, onClose, onSuccess }: BYOKModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          {/* Backdrop click listener to close */}
          <div className="absolute inset-0 cursor-default" onClick={onClose} />
          <BYOKCard isModal onSuccess={onSuccess} onClose={onClose} />
        </div>
      )}
    </AnimatePresence>
  );
}
