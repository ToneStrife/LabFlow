"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Camera, FileText, ImageIcon, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { compressImageFile } from "@/utils/image-file";

interface FileUploadInputProps {
  label: string;
  accept?: string;
  capture?: "user" | "environment";
  onChange: (files: FileList | null) => void;
  disabled?: boolean;
  currentFileMeta?: { name: string; size: number } | null;
  className?: string;
  compact?: boolean;
  compressImages?: boolean;
  onPickerActiveChange?: (active: boolean) => void;
}

function fileListFromFile(file: File | null): FileList | null {
  if (!file) return null;
  const dt = new DataTransfer();
  dt.items.add(file);
  return dt.files;
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
  compressImages = false,
  onPickerActiveChange,
}) => {
  const desktopInputId = useId();
  const cameraInputId = useId();
  const galleryInputId = useId();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(currentFileMeta?.name || null);
  const [isProcessing, setIsProcessing] = useState(false);

  const useMobilePickers = Boolean(capture);

  useEffect(() => {
    setFileName(currentFileMeta?.name || null);
  }, [currentFileMeta]);

  const clearActiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markPickerActive = () => {
    if (clearActiveTimerRef.current) {
      clearTimeout(clearActiveTimerRef.current);
      clearActiveTimerRef.current = null;
    }
    onPickerActiveChange?.(true);
  };

  const schedulePickerInactive = (delayMs = 3000) => {
    if (clearActiveTimerRef.current) clearTimeout(clearActiveTimerRef.current);
    clearActiveTimerRef.current = setTimeout(() => {
      onPickerActiveChange?.(false);
      clearActiveTimerRef.current = null;
    }, delayMs);
  };

  useEffect(
    () => () => {
      if (clearActiveTimerRef.current) clearTimeout(clearActiveTimerRef.current);
    },
    []
  );

  const clearAllInputs = () => {
    [cameraInputRef, galleryInputRef, desktopInputRef].forEach((ref) => {
      if (ref.current) ref.current.value = "";
    });
  };

  const emitFile = async (file: File | null) => {
    if (!file) {
      setFileName(null);
      onChange(null);
      return;
    }
    setIsProcessing(true);
    try {
      const processed = compressImages ? await compressImageFile(file) : file;
      setFileName(processed.name);
      onChange(fileListFromFile(processed));
    } finally {
      setIsProcessing(false);
      schedulePickerInactive(3000);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    markPickerActive();
    const file = event.target.files?.[0] ?? null;
    await emitFile(file);
    event.target.value = "";
  };

  const handlePickerOpen = () => {
    if (!disabled) markPickerActive();
  };

  const handlePickerCancel = () => {
    schedulePickerInactive(500);
  };

  const handlePickerPointerDown = () => {
    if (!disabled) markPickerActive();
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearAllInputs();
    setFileName(null);
    onChange(null);
  };

  const pickerInputProps = {
    disabled: disabled || isProcessing,
    className: "sr-only" as const,
    onPointerDown: handlePickerPointerDown,
    onClick: handlePickerOpen,
    onChange: handleFileChange,
    onCancel: handlePickerCancel,
  };

  const displayFileName = fileName || currentFileMeta?.name || null;
  const zoneClass = cn(
    "flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg bg-muted/50 transition-colors",
    compact ? "min-h-24 sm:min-h-32" : "min-h-32",
    disabled && "opacity-50"
  );

  if (displayFileName) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label>{label}</Label>
        <div className={cn(zoneClass, "px-4 py-3")}>
          <div className="flex items-center justify-between w-full gap-2 min-w-0">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium truncate">{displayFileName}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemoveFile}
              disabled={disabled || isProcessing}
              className="flex-shrink-0"
              aria-label="Quitar archivo"
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>

      {useMobilePickers ? (
        <>
          <input
            ref={cameraInputRef}
            id={cameraInputId}
            type="file"
            accept="image/*"
            capture={capture}
            {...pickerInputProps}
          />
          <input
            ref={galleryInputRef}
            id={galleryInputId}
            type="file"
            accept={accept}
            {...pickerInputProps}
          />
          <input
            ref={desktopInputRef}
            id={desktopInputId}
            type="file"
            accept={accept}
            className="sr-only hidden sm:block"
            disabled={disabled || isProcessing}
            onPointerDown={handlePickerPointerDown}
            onClick={handlePickerOpen}
            onChange={handleFileChange}
            onCancel={handlePickerCancel}
          />

          <div className={cn("space-y-2 sm:hidden", zoneClass, "p-3")}>
            <Label
              htmlFor={cameraInputId}
              onPointerDown={handlePickerPointerDown}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-medium cursor-pointer w-full",
                (disabled || isProcessing) && "pointer-events-none opacity-50"
              )}
            >
              <Camera className="h-4 w-4 shrink-0" />
              {isProcessing ? "Procesando foto…" : "Tomar foto del albarán"}
            </Label>
            <Label
              htmlFor={galleryInputId}
              onPointerDown={handlePickerPointerDown}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-medium cursor-pointer w-full",
                (disabled || isProcessing) && "pointer-events-none opacity-50"
              )}
            >
              <ImageIcon className="h-4 w-4 shrink-0" />
              Elegir de galería o PDF
            </Label>
          </div>

          <label
            htmlFor={desktopInputId}
            className={cn(zoneClass, "cursor-pointer hidden sm:flex")}
          >
            <div className="flex flex-col items-center justify-center py-6 px-4 pointer-events-none">
              <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center font-semibold">Haz clic para subir</p>
              <p className="text-xs text-muted-foreground text-center mt-1">PDF, JPG, PNG (Máx. 5&nbsp;MB)</p>
            </div>
          </label>
        </>
      ) : (
        <>
          <input
            ref={desktopInputRef}
            id={desktopInputId}
            type="file"
            accept={accept}
            capture={capture}
            className="sr-only"
            disabled={disabled || isProcessing}
            onPointerDown={handlePickerPointerDown}
            onClick={handlePickerOpen}
            onChange={handleFileChange}
            onCancel={handlePickerCancel}
          />
          <label
            htmlFor={desktopInputId}
            onPointerDown={handlePickerPointerDown}
            className={cn(zoneClass, "cursor-pointer", disabled && "pointer-events-none")}
          >
            <div className="flex flex-col items-center justify-center py-6 px-4 pointer-events-none">
              <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground text-center">
                <span className="font-semibold">Haz clic para subir</span>
                <span className="hidden sm:inline"> o arrastra y suelta</span>
              </p>
              <p className="text-xs text-muted-foreground text-center">PDF, JPG, PNG (Máx. 5&nbsp;MB)</p>
            </div>
          </label>
        </>
      )}
    </div>
  );
};

export default FileUploadInput;
