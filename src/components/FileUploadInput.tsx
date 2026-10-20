import React, { useEffect, useId, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Camera, ClipboardPaste, FileText, ImageIcon, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { compressImageFile } from "@/utils/image-file";
import { assertRequestFileSize } from "@/utils/storage-file";
import { toast } from "sonner";

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
  /** Texto del botón de cámara en móvil */
  cameraLabel?: string;
  /** Texto del botón de galería en móvil */
  galleryLabel?: string;
  /** Pista bajo la zona de subida */
  hintText?: string;
  /** Permitir Ctrl/Cmd+V o botón para pegar captura del portapapeles */
  allowPasteImage?: boolean;
}

function fileListFromFile(file: File | null): FileList | null {
  if (!file) return null;
  const dt = new DataTransfer();
  dt.items.add(file);
  return dt.files;
}

function fileFromClipboardItem(item: DataTransferItem): File | null {
  if (!item.type.startsWith("image/")) return null;
  const blob = item.getAsFile();
  if (!blob) return null;
  const ext =
    item.type === "image/png"
      ? "png"
      : item.type === "image/webp"
        ? "webp"
        : "jpg";
  const name =
    blob.name && blob.name !== "image.png" && blob.name !== "image.jpg"
      ? blob.name
      : `captura-${Date.now()}.${ext}`;
  return new File([blob], name, { type: item.type || blob.type, lastModified: Date.now() });
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
  cameraLabel = "Tomar foto",
  galleryLabel = "Elegir imagen, captura o PDF",
  hintText = "PDF, imagen o captura (JPG/PNG). Máx. 20 MB",
  allowPasteImage = true,
}) => {
  const desktopInputId = useId();
  const cameraInputId = useId();
  const galleryInputId = useId();
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(currentFileMeta?.name || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const useMobilePickers = Boolean(capture);
  const acceptsImages = accept.includes("image");

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
      assertRequestFileSize(processed);
      setFileName(processed.name);
      onChange(fileListFromFile(processed));
    } catch (error) {
      setFileName(null);
      onChange(null);
      toast.error(error instanceof Error ? error.message : "No se pudo leer el archivo.");
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

  const takeImageFromClipboard = async (clipboardData: DataTransfer | null) => {
    if (!allowPasteImage || !acceptsImages || !clipboardData) return false;
    for (const item of Array.from(clipboardData.items)) {
      const file = fileFromClipboardItem(item);
      if (file) {
        await emitFile(file);
        toast.success("Captura pegada como archivo.");
        return true;
      }
    }
    return false;
  };

  const handlePasteFromClipboardButton = async () => {
    if (disabled || isProcessing || !allowPasteImage || !acceptsImages) return;
    try {
      if (!navigator.clipboard?.read) {
        toast.error("Tu navegador no permite pegar imágenes desde aquí. Usa Ctrl+V sobre la zona de subida.");
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        const ext = imageType === "image/png" ? "png" : imageType === "image/webp" ? "webp" : "jpg";
        await emitFile(
          new File([blob], `captura-${Date.now()}.${ext}`, {
            type: imageType,
            lastModified: Date.now(),
          })
        );
        toast.success("Captura pegada como archivo.");
        return;
      }
      toast.error("No hay ninguna imagen en el portapapeles.");
    } catch {
      toast.error("No se pudo leer el portapapeles. Prueba Ctrl+V (o Cmd+V) sobre la zona de subida.");
    }
  };

  useEffect(() => {
    if (!allowPasteImage || !acceptsImages || disabled) return;
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      void takeImageFromClipboard(event.clipboardData).then((ok) => {
        if (ok) event.preventDefault();
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // emitFile cambia cada render; el listener solo necesita las flags.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowPasteImage, acceptsImages, disabled]);

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled || isProcessing) return;
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) await emitFile(file);
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
    disabled && "opacity-50",
    isDragOver && "border-primary bg-primary/5"
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
    <div
      ref={dropZoneRef}
      className={cn("space-y-2", className)}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
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
              {isProcessing ? "Procesando foto…" : cameraLabel}
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
              {galleryLabel}
            </Label>
            {allowPasteImage && acceptsImages && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={disabled || isProcessing}
                onClick={handlePasteFromClipboardButton}
              >
                <ClipboardPaste className="mr-2 h-4 w-4" />
                Pegar captura del portapapeles
              </Button>
            )}
          </div>

          <label
            htmlFor={desktopInputId}
            className={cn(zoneClass, "cursor-pointer hidden sm:flex")}
          >
            <div className="flex flex-col items-center justify-center py-6 px-4 pointer-events-none">
              <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center font-semibold">Haz clic para subir</p>
              <p className="text-xs text-muted-foreground text-center mt-1">{hintText}</p>
            </div>
          </label>
          {allowPasteImage && acceptsImages && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              disabled={disabled || isProcessing}
              onClick={handlePasteFromClipboardButton}
            >
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Pegar captura (o Ctrl+V / Cmd+V)
            </Button>
          )}
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
              <p className="text-xs text-muted-foreground text-center">{hintText}</p>
            </div>
          </label>
          {allowPasteImage && acceptsImages && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || isProcessing}
              onClick={handlePasteFromClipboardButton}
            >
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Pegar captura del portapapeles (también Ctrl+V / Cmd+V)
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default FileUploadInput;
