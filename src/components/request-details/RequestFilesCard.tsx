"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Paperclip } from "lucide-react";
import { SupabaseRequest } from "@/hooks/use-requests";
import { FileType } from "@/hooks/use-requests";

interface RequestFilesCardProps {
  request: SupabaseRequest;
  onUploadClick: (fileType: FileType) => void;
}

const getFileNameFromUrl = (url: string): string => {
  if (!url) return "File";
  try {
    const urlParts = url.split('/');
    const encodedFileName = urlParts[urlParts.length - 1];
    const decodedFileName = decodeURIComponent(encodedFileName);
    // Eliminar el prefijo de timestamp (ej. "1678886400000_")
    const nameWithoutPrefix = decodedFileName.substring(decodedFileName.indexOf('_') + 1);
    return nameWithoutPrefix || "File"; // Fallback si algo sale mal
  } catch (e) {
    console.error("Could not parse filename from URL", e);
    return "File";
  }
};

const FileRow: React.FC<{ label: string; url: string | null; onUpload: () => void }> = ({ label, url, onUpload }) => (
  <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
    <div className="flex items-center">
      <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
      <span className="font-medium">{label}</span>
    </div>
    {url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center" title={getFileNameFromUrl(url)}>
        <Paperclip className="h-4 w-4 mr-1" />
        <span className="truncate max-w-[150px]">{getFileNameFromUrl(url)}</span>
      </a>
    ) : (
      <Button variant="outline" size="sm" onClick={onUpload}>
        <Upload className="h-4 w-4 mr-2" />
        Upload
      </Button>
    )}
  </div>
);

const RequestFilesCard: React.FC<RequestFilesCardProps> = ({ request, onUploadClick }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attached Files</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <FileRow label="Quote" url={request.quote_url} onUpload={() => onUploadClick("quote")} />
        <FileRow label="Purchase Order" url={request.po_url} onUpload={() => onUploadClick("po")} />
        <FileRow label="Packing Slip" url={request.slip_url} onUpload={() => onUploadClick("slip")} />
      </CardContent>
    </Card>
  );
};

export default RequestFilesCard;