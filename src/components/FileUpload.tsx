import React, { useCallback } from "react";
import { Upload, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing }) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-all duration-300 cursor-pointer ${
        isDragOver
          ? "border-primary bg-primary/5 glow-primary"
          : "border-border hover:border-primary/50"
      } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById("csv-upload")?.click()}
    >
      <input
        id="csv-upload"
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileInput}
      />
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          {isProcessing ? (
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-primary" />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            {isProcessing ? "Analyzing transactions..." : "Drop CSV file here"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            or click to browse • Requires: transaction_id, sender_id, receiver_id, amount, timestamp
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="w-3 h-3" />
          <span className="font-mono">Up to 10,000 transactions supported</span>
        </div>
      </div>
    </motion.div>
  );
};

export default FileUpload;
