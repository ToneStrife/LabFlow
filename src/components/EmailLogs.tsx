"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { EmailLog } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAllProfiles } from "@/hooks/use-profiles";

const fetchEmailLogs = async (): Promise<EmailLog[]> => {
  const { data, error } = await supabase
    .from('email_logs')
    .select(`
      *,
      sender:profiles(first_name, last_name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data.map(log => ({
    ...log,
    sent_by_name: log.sender ? `${log.sender.first_name || ''} ${log.sender.last_name || ''}`.trim() : 'N/A'
  })) as EmailLog[];
};

const EmailLogs: React.FC = () => {
  const { data: emailLogs, isLoading, error } = useQuery<EmailLog[], Error>({
    queryKey: ['emailLogs'],
    queryFn: fetchEmailLogs,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando registros de correo...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error al cargar registros de correo: {error.message}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Registros de Correo Electrónico</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Fecha</TableHead>
                <TableHead>Para</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Enviado Por</TableHead>
                <TableHead className="w-[200px]">Vista Previa del Cuerpo / Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emailLogs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No hay registros de correo electrónico.
                  </TableCell>
                </TableRow>
              ) : (
                emailLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                    <TableCell>{log.to_email}</TableCell>
                    <TableCell>{log.subject}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'success' : 'destructive'}>
                        {log.status === 'success' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {log.status === 'success' ? 'Éxito' : 'Fallido'}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.sent_by_name || 'Sistema'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {log.status === 'failed' && log.error_message ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-red-500 flex items-center cursor-help">
                                <Info className="h-4 w-4 mr-1" /> Error
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{log.error_message}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{log.body_preview}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md">
                              <p>{log.body_preview}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailLogs;