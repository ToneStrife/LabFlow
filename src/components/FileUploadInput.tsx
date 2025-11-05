"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Label } from "@/components/ui/label";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileUploadInputProps {
  label: string;
  accept?: string; // e.g. "image/*,application/pdf"
  onChange: (files: FileList | null) => void;
  disabled?: boolean;
  currentFile?: File | null;
}

const toDropzoneAccept = (accept?: string) => {
  if (!accept) return undefined;
  // "image/*,application/pdf" -> { "image/*": [], "application/pdf": [] }
  const entries = accept
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((k) => [k, [] as string[]]);
  return Object.fromEntries(entries);
};

const FileUploadInput: React.FC<FileUploadInputProps> = ({
  label,
  accept = "image/*,application/pdf",
  onChange,
  disabled = false,
  currentFile,
}) => {
  const [file, setFile] = useState<File | null>(currentFile || null);

  // --- Sincroniza estado interno si cambia currentFile desde fuera
  useEffect(() => {
    setFile(currentFile ?? null);
  }, [currentFile]);

  const dzAccept = useMemo(() => toDropzoneAccept(accept), [accept]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const newFile = acceptedFiles[0];
        setFile(newFile);
        const dt = new DataTransfer();
        dt.items.add(newFile);
        onChange(dt.files);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: dzAccept,
    maxFiles: 1,
    disabled,
    noClick: true, // usamos open() en el contenedor para click controlado
  });

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        {...getRootProps()}
        onClick={() => !disabled && open()}
        className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 transition-colors",
          isDragActive ? "border-primary bg-muted/70" : "border-input",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        {file ? (
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center space-x-2 min-w-0">
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium truncate">{file.name}</span>
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
