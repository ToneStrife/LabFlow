"use client";

import React, { useState, useEffect } from "react";
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
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/components/ui/use-toast";
import { useSupabaseClient } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Profile } from "@/hooks/use-profiles"; // Importar el tipo Profile

// Esquema de validación para los ítems de la solicitud
const requestItemSchema = z.object({
  product_name: z.string().min(1, "Product name is required"),
  catalog_number: z.string().min(1, "Catalog number is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit_price: z.coerce.number().optional(),
  format: z.string().optional(),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
  brand: z.string().optional(),
});

// Esquema de validación para el formulario de solicitud
const requestFormSchema = z.object({
  vendor_id: z.string().min(1, "Vendor is required"),
  notes: z.string().optional(),
  project_codes: z.array(z.string()).optional(),
  account_manager_id: z.string().optional(),
  request_items: z.array(requestItemSchema).min(1, "At least one item is required"),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

interface RequestFormProps {
  defaultValues?: Partial<RequestFormValues>;
  onSubmitSuccess?: (requestId: string) => void;
}

const RequestForm: React.FC<RequestFormProps> = ({ defaultValues, onSubmitSuccess }) => {
  const { toast } = useToast();
  const supabase = useSupabaseClient();
  const { session, profile } = useSession();
  const navigate = useNavigate();

  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [accountManagers, setAccountManagers] = useState<Profile[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [isLoadingAccountManagers, setIsLoadingAccountManagers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      request_items: [{ product_name: "", catalog_number: "", quantity: 1 }],
      ...defaultValues,
    },
  });

  useEffect(() => {
    const fetchVendors = async () => {
      setIsLoadingVendors(true);
      const { data, error } = await supabase.from("vendors").select("id, name");
      if (error) {
        toast({
          title: "Error fetching vendors",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setVendors(data || []);
      }
      setIsLoadingVendors(false);
    };

    const fetchAccountManagers = async () => {
      setIsLoadingAccountManagers(true);
      const { data, error } = await supabase.from("profiles").select("id, first_name, last_name, role").eq("role", "Account Manager");
      if (error) {
        toast({
          title: "Error fetching account managers",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setAccountManagers(data || []);
      }
      setIsLoadingAccountManagers(false);
    };

    fetchVendors();
    fetchAccountManagers();
  }, [supabase, toast]);

  const onSubmit = async (values: RequestFormValues) => {
    setIsSubmitting(true);
    if (!session?.user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a request.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Insertar la solicitud principal
      const { data: requestData, error: requestError } = await supabase
        .from("requests")
        .insert({
          vendor_id: values.vendor_id,
          requester_id: session.user.id,
          notes: values.notes,
          project_codes: values.project_codes,
          account_manager_id: values.account_manager_id === "unassigned" ? null : values.account_manager_id,
          status: "Pending", // Estado inicial
        })
        .select("id")
        .single();

      if (requestError) throw requestError;

      const requestId = requestData.id;

      // Insertar los ítems de la solicitud
      const itemsToInsert = values.request_items.map((item) => ({
        ...item,
        request_id: requestId,
        unit_price: item.unit_price || null, // Asegurar que sea null si está vacío
      }));

      const { error: itemsError } = await supabase
        .from("request_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: "Request created successfully!",
        description: `Request #${requestId.substring(0, 8)} has been submitted.`,
      });

      if (onSubmitSuccess) {
        onSubmitSuccess(requestId);
      } else {
        navigate(`/requests/${requestId}`);
      }
    } catch (error: any) {
      console.error("Error creating request:", error);
      toast({
        title: "Error creating request",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const appendItem = () => {
    form.setValue("request_items", [...form.getValues("request_items"), { product_name: "", catalog_number: "", quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues("request_items");
    form.setValue("request_items", currentItems.filter((_, i) => i !== index));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="vendor_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vendor</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingVendors}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingVendors ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading vendors...
                    </div>
                  ) : vendors.length === 0 ? (
                    <SelectItem value="no-vendors" disabled>No vendors available</SelectItem>
                  ) : (
                    vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Contenedor para los campos de Account Manager y Project Codes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="account_manager_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Manager (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "unassigned"} disabled={isLoadingAccountManagers}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an Account Manager" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingAccountManagers ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading account managers...
                      </div>
                    ) : (
                      <>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {accountManagers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.first_name} {manager.last_name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="project_codes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Codes (Optional)</FormLabel>
                <FormControl>
                  <MultiSelect
                    selected={field.value || []}
                    options={[
                      { label: "Project A", value: "project_a" },
                      { label: "Project B", value: "project_b" },
                      { label: "Project C", value: "project_c" },
                    ]}
                    onChange={field.onChange}
                    className="w-full"
                    placeholder="Select project codes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional notes for the request" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <h3 className="text-lg font-semibold mt-8 mb-4">Request Items</h3>
        {form.watch("request_items").map((item, index) => (
          <div key={index} className="border p-4 rounded-md space-y-4 relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name={`request_items.${index}.product_name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`request_items.${index}.catalog_number`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catalog Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Catalog number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`request_items.${index}.quantity`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Quantity" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`request_items.${index}.unit_price`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Unit price" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`request_items.${index}.format`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 100g, 1L" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`request_items.${index}.brand`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Brand name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name={`request_items.${index}.link`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Link to product page" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`request_items.${index}.notes`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any specific notes for this item" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch("request_items").length > 1 && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeItem(index)}
                className="absolute top-2 right-2"
              >
                Remove Item
              </Button>
            )}
          </div>
        ))}
        <Button type="button" onClick={appendItem} variant="outline" className="w-full">
          Add Another Item
        </Button>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
            </>
          ) : (
            "Submit Request"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default RequestForm;