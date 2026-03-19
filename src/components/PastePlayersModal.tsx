import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, ClipboardPaste } from "lucide-react";

interface PastePlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (names: string[]) => void;
  existingNames: string[];
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function parseNames(text: string): string[] {
  return text
    .split(/[\n,\t]+/)
    .map((n) => {
      let cleaned = n.trim();
      // Strip leading numbering: "1. ", "2) ", "3 - ", "1:", "#1 ", "- ", "• "
      cleaned = cleaned.replace(/^(?:#?\d+[\.\)\:\-\s]+|[\-•●]\s*)/, "").trim();
      // Strip trailing numbering artifacts
      cleaned = cleaned.replace(/\s*[\(\[]?\d+[\)\]]?$/, "").trim();
      return cleaned;
    })
    .filter((n) => n.length > 0 && n.length <= 30);
}

export function PastePlayersModal({ isOpen, onClose, onImport, existingNames, t }: PastePlayersModalProps) {
  const [text, setText] = useState("");

  const parsed = parseNames(text);
  const existingLower = new Set(existingNames.map((n) => n.toLowerCase()));
  const seen = new Set<string>();
  const unique: string[] = [];
  const duplicates: string[] = [];

  for (const name of parsed) {
    const lower = name.toLowerCase();
    if (existingLower.has(lower) || seen.has(lower)) {
      duplicates.push(name);
    } else {
      seen.add(lower);
      unique.push(name);
    }
  }

  const handleImport = () => {
    if (unique.length === 0) return;
    onImport(unique);
    setText("");
    onClose();
  };

  const handleClose = () => {
    setText("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed inset-x-4 top-[15%] z-50 mx-auto max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground">{t("pasteList.title")}</h3>
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">{t("pasteList.hint")}</p>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("pasteList.placeholder")}
                rows={6}
                className="resize-none font-mono text-sm"
                autoFocus
              />

              {/* Preview */}
              {parsed.length > 0 && (
                <div className="text-sm space-y-1">
                  <div className="text-foreground font-medium">
                    {t("pasteList.preview", { count: unique.length })}
                  </div>
                  {duplicates.length > 0 && (
                    <div className="text-amber-500 text-xs">
                      {t("pasteList.duplicates", { count: duplicates.length })}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {unique.map((name, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <Button
                onClick={handleImport}
                disabled={unique.length === 0}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                {t("pasteList.import", { count: unique.length })}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
