"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SentEmail } from "@/data/types";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Paperclip, CheckCircle, XCircle } from "lucide-react";

interface EmailLogTableProps {
  emailLogs: SentEmail[];
}

const EmailLogTable: React.FC<EmailLogTableProps> = ({ emailLogs }) => {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Fecha</TableHead>
            <TableHead>Para</TableHead>
            <TableHead>Asunto</TableHead>
            <TableHead>Enviado Por</TableHead>
            <TableHead className="text-center">Adjuntos</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead>Mensaje de Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emailLogs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No se encontraron registros de correos electrónicos enviados.
              </TableCell>
            </TableRow>
          ) : (
            emailLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell className="max-w-[150px] truncate" title={log.to_email}>
                  {log.to_email}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{log.subject}</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold">Asunto:</p>
                        <p>{log.subject}</p>
                        {log.body_preview && (
                          <>
                            <p className="font-semibold mt-2">Vista Previa del Cuerpo:</p>
                            <p className="text-sm italic">{log.body_preview}...</p>
                          </>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  {(log as any).sent_by_name || "N/A"}
                </TableCell>
                <TableCell className="text-center">
                  {log.attachments_count > 0 ? (
                    <div className="flex items-center justify-center text-muted-foreground">
                      <Paperclip className="h-4 w-4 mr-1" /> {log.attachments_count}
                    </div>
                  ) : '0'}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={log.status === 'success' ? 'success' : 'destructive'} className="flex items-center justify-center">
                    {log.status === 'success' ? <CheckCircle className="h-4 w-4 mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                    {log.status === 'success' ? 'Éxito' : 'Fallido'}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                  {log.error_message || 'N/A'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default EmailLogTable;