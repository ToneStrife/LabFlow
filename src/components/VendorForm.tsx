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
import { Loader2 } from "lucide-react";
import { VendorFormValues } from "@/hooks/use-vendors";

const optionalEmail = z
  .string()
  .email({ message: "Debe ser una dirección de correo válida." })
  .optional()
  .or(z.literal(""))
  .nullable();

const vendorFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre del proveedor es obligatorio." }),
  contact_person: z.string().optional().nullable(),
  email: optionalEmail,
  email_presupuesto: optionalEmail,
  email_pedido: optionalEmail,
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  brands: z.string().optional().nullable(),
});

// This type is now correctly inferred from the schema above

interface VendorFormProps {
  initialData?: VendorFormValues;
  onSubmit: (data: VendorFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const VendorForm: React.FC<VendorFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          email_presupuesto:
            initialData.email_presupuesto ?? initialData.email ?? null,
          email_pedido: initialData.email_pedido ?? initialData.email ?? null,
        }
      : {
          name: "",
          contact_person: null,
          email: null,
          email_presupuesto: null,
          email_pedido: null,
          phone: null,
          notes: null,
          brands: null,
        },
  });

  const handleSubmit = (data: VendorFormValues) => {
    const emailPresupuesto = data.email_presupuesto || null;
    const emailPedido = data.email_pedido || null;
    const cleanedData: VendorFormValues = {
      name: data.name,
      contact_person: data.contact_person || null,
      email: emailPresupuesto || emailPedido || data.email || null,
      email_presupuesto: emailPresupuesto,
      email_pedido: emailPedido,
      phone: data.phone || null,
      notes: data.notes || null,
      brands: data.brands || null,
    };
    onSubmit(cleanedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Proveedor</FormLabel>
              <FormControl>
                <Input placeholder="ej. Thermo Fisher Scientific" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contact_person"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Persona de Contacto (Opcional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="ej. Jane Doe" 
                  {...field} 
                  disabled={isSubmitting} 
                  value={field.value || ""} 
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email_presupuesto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email presupuestos (opcional)</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="ej. presupuestos@proveedor.es"
                  {...field}
                  disabled={isSubmitting}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email_pedido"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email pedidos (opcional)</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="ej. pedidos@proveedor.es"
                  {...field}
                  disabled={isSubmitting}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <details className="rounded-lg border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            Opciones secundarias (teléfono, marcas, notas)
          </summary>
          <div className="mt-3 space-y-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ej. 1-800-123-4567"
                      {...field}
                      disabled={isSubmitting}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brands"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marcas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ej. Invitrogen, Applied Biosystems, Gibco (separadas por comas)"
                      {...field}
                      disabled={isSubmitting}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Cualquier detalle específico sobre este proveedor..."
                      {...field}
                      disabled={isSubmitting}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </details>
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              initialData ? "Guardar Cambios" : "Añadir Proveedor"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default VendorForm;