"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  // FormDescription, <-- Eliminado para evitar el ReferenceError
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Users, Bell } from "lucide-react";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { useSendNotification, useSendTestNotification } from "@/hooks/use-notifications";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

const notificationFormSchema = z.object({
  title: z.string().min(1, { message: "El título es obligatorio." }),
  body: z.string().min(1, { message: "El cuerpo del mensaje es obligatorio." }),
  link: z.string().url({ message: "Debe ser una URL válida." }).optional().or(z.literal("")),
  targetUserIds: z.array(z.string()).optional(),
  sendToAll: z.boolean().default(false),
});

type NotificationFormValues = z.infer<typeof notificationFormSchema>;

const NotificationSenderForm: React.FC = () => {
  const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const sendNotificationMutation = useSendNotification();
  const sendTestNotificationMutation = useSendTestNotification(); // Hook de prueba

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      title: "",
      body: "",
      link: "",
      targetUserIds: [],
      sendToAll: false,
    },
  });
  
  const { watch, setValue } = form;
  const sendToAll = watch("sendToAll");
  const targetUserIds = watch("targetUserIds");

  const handleSubmit = async (data: NotificationFormValues) => {
    const userIdsToSend = data.sendToAll ? undefined : data.targetUserIds;
    
    if (!data.sendToAll && (!userIdsToSend || userIdsToSend.length === 0)) {
      toast.error("Selección requerida", { description: "Debes seleccionar al menos un usuario o marcar 'Enviar a todos'." });
      return;
    }
    
    await sendNotificationMutation.mutateAsync({
      user_ids: userIdsToSend,
      title: data.title,
      body: data.body,
      link: data.link || undefined,
      data: {
        source: 'admin_broadcast',
      }
    });
    
    form.reset({
      title: "",
      body: "",
      link: "",
      targetUserIds: [],
      sendToAll: false,
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setValue("targetUserIds", profiles?.map(p => p.id) || [], { shouldDirty: true });
    } else {
      setValue("targetUserIds", [], { shouldDirty: true });
    }
  };
  
  const handleSelectUser = (userId: string, checked: boolean) => {
    const currentIds = form.getValues("targetUserIds") || [];
    if (checked) {
      setValue("targetUserIds", [...currentIds, userId], { shouldDirty: true });
    } else {
      setValue("targetUserIds", currentIds.filter(id => id !== userId), { shouldDirty: true });
    }
  };
  
  const handleSendTest = async () => {
    await sendTestNotificationMutation.mutateAsync();
  };
  
  const isAllSelected = profiles && targetUserIds && profiles.length > 0 && targetUserIds.length === profiles.length;
  const isSubmitting = sendNotificationMutation.isPending || sendTestNotificationMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna de Contenido del Mensaje */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">Contenido del Mensaje</h3>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título de la Notificación</FormLabel>
                  <FormControl><Input placeholder="ej. Nueva Solicitud Pendiente" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuerpo del Mensaje</FormLabel>
                  <FormControl><Textarea rows={4} placeholder="Detalles del mensaje..." {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enlace de Destino (Opcional)</FormLabel>
                  <FormControl><Input type="url" placeholder="ej. /dashboard" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Columna de Selección de Usuarios */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2 h-5 w-5" /> Seleccionar Destinatarios</h3>
            
            <FormField
              control={form.control}
              name="sendToAll"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked) setValue("targetUserIds", []); // Deseleccionar individuos si se marca "todos"
                      }}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-base">
                      Enviar a todos los usuarios registrados
                    </FormLabel>
                    {/* Reemplazo de FormDescription */}
                    <p className="text-[0.8rem] text-muted-foreground">
                      Si está marcado, se ignorará la selección individual.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel className="flex justify-between items-center">
                Usuarios Individuales ({targetUserIds?.length || 0} seleccionados)
                <Button 
                    type="button" 
                    variant="link" 
                    size="sm" 
                    onClick={() => handleSelectAll(!isAllSelected)}
                    disabled={sendToAll || isLoadingProfiles || isSubmitting}
                >
                    {isAllSelected ? "Deseleccionar Todos" : "Seleccionar Todos"}
                </Button>
              </FormLabel>
              <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-background">
                {isLoadingProfiles ? (
                  <div className="flex justify-center items-center h-full"><Loader2 className="h-4 w-4 animate-spin" /> Cargando usuarios...</div>
                ) : (
                  profiles?.map(profile => (
                    <div key={profile.id} className="flex items-center space-x-2 py-1.5">
                      <Checkbox
                        id={profile.id}
                        checked={targetUserIds?.includes(profile.id)}
                        onCheckedChange={(checked) => handleSelectUser(profile.id, !!checked)}
                        disabled={sendToAll || isSubmitting}
                      />
                      <label
                        htmlFor={profile.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {getFullName(profile)} ({profile.role})
                      </label>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleSendTest} 
            disabled={isSubmitting}
          >
            {sendTestNotificationMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Probando...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" /> Enviar Prueba (Solo yo)
              </>
            )}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Enviar Notificación
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default NotificationSenderForm;