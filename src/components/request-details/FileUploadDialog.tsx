"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { FileType } from "@/hooks/use-requests";

interface FileUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, poNumber?: string) => Promise<void>;
  isUploading: boolean;
  fileType: FileType;
}

const FileUploadDialog: React.FC<FileUploadDialogProps> = ({
  isOpen,
  onOpenChange,
  onUpload,
  isUploading,
  fileType,
}) => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [poNumber, setPoNumber] = React.useState<string>("");

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPoNumber("");
    }
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (selectedFile) {
      // Only pass poNumber if fileType is 'po'
      const poNumToPass = fileType === 'po' ? poNumber || undefined : undefined;
      await onUpload(selectedFile, poNumToPass);
    }
  };

  const getTitle = () => {
    switch (fileType) {
      case "quote": return "Upload Quote File";
      case "po": return "Upload Purchase Order File";
      case "slip": return "Upload Packing Slip";
      default: return "Upload File";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            Selecciona un archivo para subir.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* PO Number is only relevant when uploading the PO file */}
          {fileType === "po" && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="poNumber" className="text-right">
                PO Number (Optional)
              </Label>
              <Input
                id="poNumber"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="col-span-3"
                placeholder="e.g., PO-12345"
                disabled={isUploading}
              />
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right">
              File
            </Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              className="col-span-3"
              disabled={isUploading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedFile || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadDialog;