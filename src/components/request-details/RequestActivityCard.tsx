"use client";

import React from "react";
import { History, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRequestActivity } from "@/hooks/use-request-events";
import ActivityEventRow from "@/components/ActivityEventRow";

interface RequestActivityCardProps {
  requestId: string;
}

const RequestActivityCard: React.FC<RequestActivityCardProps> = ({ requestId }) => {
  const { actividad, isLoading, error } = useRequestActivity(requestId);

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center text-base">
          <History className="mr-2 h-4 w-4" /> Actividad
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="flex items-center px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando…
          </p>
        ) : error ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            El registro de actividad aún no está disponible.
          </p>
        ) : actividad.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            Sin eventos todavía. Las llegadas y los cambios de estado aparecerán aquí.
          </p>
        ) : (
          <ul className="divide-y">
            {actividad.map((evento) => (
              <ActivityEventRow key={evento.id} event={evento} mostrarSolicitud={false} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestActivityCard;
