"use client";

import React, { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileUploadInputProps {
  label: string;
  accept?: string;
  capture?: "user" | "environment";
  onChange: (files: FileList | null) => void;
  disabled?: boolean;
  currentFileMeta?: { name: string; size: number } | null;
  className?: string;
  compact?: boolean;
}

const FileUploadInput: React.FC<FileUploadInputProps> = ({
  label,
  accept = "image/*,application/pdf",
  capture,
  onChange,
  disabled = false,
  currentFileMeta,
  className,
  compact = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(currentFileMeta?.name || null);

  useEffect(() => {
    setFileName(currentFileMeta?.name || null);
  }, [currentFileMeta]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const file = files && files.length > 0 ? files[0] : null;
    setFileName(file ? file.name : null);
    onChange(files);
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setFileName(null);
    onChange(null);
  };

  const displayFileName = fileName || currentFileMeta?.name || null;
  const hintPrimary = capture ? "Tomar foto o elegir archivo" : "Haz clic para subir";

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <div
        className={cn(
          "flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 transition-colors relative",
          compact ? "h-24 sm:h-32" : "h-32",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => {
          if (!disabled && inputRef.current) {
            inputRef.current.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          capture={capture}
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />

        {displayFileName ? (
          <div className="flex items-center justify-between w-full px-4 gap-2 min-w-0">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium truncate">{displayFileName}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemoveFile}
              disabled={disabled}
              className="flex-shrink-0"
              aria-label="Quitar archivo"
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4">
            <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground text-center">
              <span className="font-semibold">{hintPrimary}</span>
              {!capture && <span className="hidden sm:inline"> o arrastra y suelta</span>}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              PDF, JPG, PNG (Máx. 5&nbsp;MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadInput;
