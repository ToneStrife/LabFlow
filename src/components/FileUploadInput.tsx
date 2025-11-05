"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileUploadInputProps {
  label: string;
  accept?: string; // e.g. "image/*,application/pdf"
  onChange: (files: FileList | null) => void;
  disabled?: boolean;
  // currentFile ya no es un objeto File, sino la metadata para mostrar
  currentFileMeta?: { name: string; size: number } | null; 
}

const FileUploadInput: React.FC<FileUploadInputProps> = ({
  label,
  accept = "image/*,application/pdf",
  onChange,
  disabled = false,
  currentFileMeta,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(currentFileMeta?.name || null);

  // Sincroniza el nombre del archivo si la metadata externa cambia
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
      inputRef.current.value = ""; // Limpiar el input nativo
    }
    setFileName(null);
    onChange(null);
  };
  
  // Si hay metadata pero el input está vacío (pérdida de estado), mostramos la metadata
  const displayFileName = fileName || currentFileMeta?.name || null;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 transition-colors relative",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => {
            if (!disabled && inputRef.current) {
                inputRef.current.click();
            }
        }}
      >
        {/* Input de archivo oculto */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
          max={1}
        />

        {displayFileName ? (
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center space-x-2 min-w-0">
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
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground text-center">
              <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG (Máx. 5&nbsp;MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadInput;