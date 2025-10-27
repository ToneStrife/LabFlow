"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Paperclip, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Attachment } from "@/hooks/use-requests";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Importar Tabs

// Esquema de validación
const emailFormSchema = z.object({
  to: z.string().email({ message: "Dirección de correo electrónico no válida." }),
  subject: z.string().min(1, { message: "El asunto es obligatorio." }),
  body: z.string().min(1, { message: "El cuerpo del correo es obligatorio." }),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
  })).optional(),
  // Campo auxiliar para adjuntos que se envían a la Edge Function (rutas de almacenamiento)
  attachmentsForSend: z.array(z.object({
    name: z.string(),
    url: z.string(),
  })).optional(),
});

export type EmailFormValues = z.infer<typeof emailFormSchema>;

interface EmailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Partial<EmailFormValues>;
  onSend: (data: EmailFormValues) => Promise<void>;
  isSending: boolean;
}

const EmailDialog: React.FC<EmailDialogProps> = ({ isOpen, onOpenChange, initialData, onSend, isSending }) => {
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      to: "",
      subject: "",
      body: "",
      attachments: [],
      attachmentsForSend: [],
    },
    values: initialData as EmailFormValues, // Usar 'values' para inicializar con initialData
  });

  React.useEffect(() => {
    if (isOpen) {
      // Resetear el formulario con los nuevos datos iniciales cada vez que se abre
      form.reset(initialData as EmailFormValues);
    }
  }, [isOpen, initialData, form]);

  const onSubmit = async (data: EmailFormValues) => {
    try {
      await onSend(data);
      toast.success("Correo electrónico enviado con éxito.");
      onOpenChange(false);
    } catch (error) {
      console.error("Error al enviar correo:", error);
      toast.error("Error al enviar el correo electrónico.", { description: "Verifica la consola para más detalles." });
    }
  };
  
  // Función para convertir texto plano (con \n) a HTML (con <br />)
  const plainTextToHtml = (text: string) => {
    return text.replace(/\n/g, '<br />');
  };

  // Generar el HTML final para la vista previa
  const generatePreviewHtml = (body: string) => {
    // 1. Convertir el texto plano del campo 'body' a HTML básico
    const htmlBody = plainTextToHtml(body);
    
    // 2. Envolverlo en una estructura HTML simple con estilos básicos
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          h1, h2 { color: #1a202c; }
          p { margin-bottom: 15px; }
          .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 0.9em; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          ${htmlBody}
          <div class="footer">
            <p>Este correo fue enviado automáticamente por el sistema de gestión de solicitudes.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Enviar Correo Electrónico</DialogTitle>
          <DialogDescription>
            Revisa y edita el contenido antes de enviar.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col space-y-4 flex-grow overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Para</FormLabel>
                    <FormControl>
                      <Input placeholder="destinatario@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asunto</FormLabel>
                    <FormControl>
                      <Input placeholder="Asunto del correo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Sección de Adjuntos */}
            {form.watch("attachments") && form.watch("attachments")!.length > 0 && (
              <div className="space-y-2">
                <Label>Adjuntos ({form.watch("attachments")!.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {form.watch("attachments")!.map((attachment, index) => (
                    <a 
                      key={index} 
                      href={attachment.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-sm bg-secondary p-2 rounded-md hover:bg-secondary/80 transition-colors"
                    >
                      <Paperclip className="h-4 w-4" />
                      <span>{attachment.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Pestañas de Edición y Vista Previa */}
            <Tabs defaultValue="edit" className="flex flex-col flex-grow min-h-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit">Editar Texto Plano</TabsTrigger>
                <TabsTrigger value="preview">Vista Previa HTML</TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit" className="flex-grow min-h-0">
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem className="h-full flex flex-col">
                      <FormLabel>Cuerpo del Correo (Texto Plano)</FormLabel>
                      <FormControl className="flex-grow">
                        <Textarea 
                          placeholder="Escribe el cuerpo del correo aquí..." 
                          {...field} 
                          className="min-h-[200px] flex-grow resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="preview" className="flex-grow min-h-0 overflow-y-auto p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                <div 
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: generatePreviewHtml(form.watch("body")) }}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Enviar Correo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EmailDialog;