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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { useEmailTemplates, useUpdateEmailTemplate } from "@/hooks/use-email-templates";
import { EmailTemplate } from "@/data/types";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const emailTemplateFormSchema = z.object({
  template_name: z.string().min(1, { message: "El nombre de la plantilla es obligatorio." }),
  subject_template: z.string().min(1, { message: "El asunto de la plantilla es obligatorio." }),
  body_template: z.string().min(1, { message: "El cuerpo de la plantilla es obligatorio." }),
});

type EmailTemplateFormValues = z.infer<typeof emailTemplateFormSchema>;

const availablePlaceholders = [
  "{{request.id}}",
  "{{request.status}}",
  "{{request.notes}}",
  "{{request.quote_url}}",
  "{{request.po_number}}",
  "{{request.po_url}}",
  "{{request.slip_url}}",
  "{{requester.full_name}}",
  "{{requester.email}}",
  "{{vendor.name}}",
  "{{vendor.contact_person}}",
  "{{vendor.email}}",
  "{{account_manager.full_name}}",
  "{{account_manager.email}}",
  "{{items_list}}", // Special placeholder for formatted item list
  "{{cta_button}}", // Special placeholder for a call-to-action button
  "{{message}}", // Generic message placeholder
  "{{actor.full_name}}", // The user performing the action
  "{{order.itemName}}",
  "{{order.id}}",
];

const EmailTemplates: React.FC = () => {
  const { data: templates, isLoading, error } = useEmailTemplates();
  const updateTemplateMutation = useUpdateEmailTemplate();

  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | undefined>(undefined);
  const [currentTemplate, setCurrentTemplate] = React.useState<EmailTemplate | undefined>(undefined);

  const form = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateFormSchema),
    defaultValues: {
      template_name: "",
      subject_template: "",
      body_template: "",
    },
  });

  React.useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  React.useEffect(() => {
    if (selectedTemplateId && templates) {
      const template = templates.find(t => t.id === selectedTemplateId);
      setCurrentTemplate(template);
      if (template) {
        form.reset({
          template_name: template.template_name,
          subject_template: template.subject_template,
          body_template: template.body_template,
        });
      }
    }
  }, [selectedTemplateId, templates, form]);

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
  };

  const onSubmit = async (data: EmailTemplateFormValues) => {
    if (!currentTemplate) {
      toast.error("No hay plantilla seleccionada para actualizar.");
      return;
    }
    await updateTemplateMutation.mutateAsync({ id: currentTemplate.id, data });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando plantillas de correo electrónico...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error al cargar plantillas de correo electrónico: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Editor de Plantillas de Correo Electrónico</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Selecciona una plantilla para editar su asunto y contenido. Usa los placeholders para insertar datos dinámicos.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Plantilla</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Selecciona una plantilla" />
            </SelectTrigger>
            <SelectContent>
              {templates?.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.template_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentTemplate && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="template_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Plantilla</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={updateTemplateMutation.isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subject_template"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asunto</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={updateTemplateMutation.isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="body_template"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuerpo del Correo</FormLabel>
                      <FormControl>
                        <Textarea rows={10} {...field} disabled={updateTemplateMutation.isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2">
                  <FormLabel>Placeholders Disponibles</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {availablePlaceholders.map((placeholder) => (
                      <Badge key={placeholder} variant="secondary" className="font-mono text-xs">
                        {placeholder}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={updateTemplateMutation.isPending}>
                    {updateTemplateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Guardar Plantilla
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTemplates;