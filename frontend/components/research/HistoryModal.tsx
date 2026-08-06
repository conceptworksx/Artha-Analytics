import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { RecentAnalyses } from "./RecentAnalyses";
import type { AuthUser } from "@/lib/api";
import { useEffect, useRef } from "react";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
}

export function HistoryModal({ isOpen, onClose, user }: HistoryModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleOverlayClick}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-[2rem] border border-white/20 bg-white/95 p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
                Past Analysis
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 active:scale-95 cursor-pointer"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <RecentAnalyses user={user} inModal={true} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
