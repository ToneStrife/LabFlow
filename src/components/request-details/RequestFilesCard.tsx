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

const FileRow: React.FC<{ label: string; url: string | null; onUpload: () => void }> = ({ label, url, onUpload }) => (
  <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
    <div className="flex items-center">
      <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
      <span className="font-medium">{label}</span>
    </div>
    {url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center">
        <Paperclip className="h-4 w-4 mr-1" />
        View File
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