import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { GraphNode } from "@/lib/types";

interface NodeDetailPanelProps {
  node: GraphNode | null;
  onClose: () => void;
}

const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, onClose }) => {
  return (
    <AnimatePresence>
      {node && (
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          className="absolute top-4 right-4 w-72 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold font-mono text-foreground">{node.id}</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Suspicion Score</span>
              <span className={`font-mono font-bold ${node.suspicionScore >= 60 ? "text-destructive" : node.suspicionScore >= 30 ? "text-warning" : "text-success"}`}>
                {node.suspicionScore.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Sent</span>
              <span className="font-mono text-foreground">${node.totalSent.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Received</span>
              <span className="font-mono text-foreground">${node.totalReceived.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transactions</span>
              <span className="font-mono text-foreground">{node.transactionCount}</span>
            </div>
            {node.patterns.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1.5">Detected Patterns</p>
                <div className="flex flex-wrap gap-1">
                  {node.patterns.map((p) => (
                    <span key={p} className="text-xs px-2 py-0.5 rounded bg-destructive/10 text-destructive font-mono">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {node.ringIds.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1.5">Ring Membership</p>
                <div className="flex flex-wrap gap-1">
                  {node.ringIds.map((r) => (
                    <span key={r} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NodeDetailPanel;
