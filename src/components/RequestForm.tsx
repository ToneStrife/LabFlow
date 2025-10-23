"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

const itemSchema = z.object({
  productName: z.string().min(1, { message: "Product name is required." }),
  catalogNumber: z.string().optional(),
  quantity: z.preprocess(
    (val) => Number(val),
    z.number().min(1, { message: "Quantity must be at least 1." })
  ),
  unitPrice: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: "Unit price cannot be negative." }).optional()
  ),
  vendor: z.string().optional(),
  link: z.string().url({ message: "Must be a valid URL." }).optional().or(z.literal("")),
  notes: z.string().optional(),
});

const formSchema = z.object({
  requestTitle: z.string().min(1, { message: "Request title is required." }),
  projectCode: z.string().optional(),
  items: z.array(itemSchema).min(1, { message: "At least one item is required." }),
  attachments: z.any().optional(), // For file uploads, handled separately
});

type RequestFormValues = z.infer<typeof formSchema>;

const RequestForm: React.FC = () => {
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requestTitle: "",
      projectCode: "",
      items: [{ productName: "", catalogNumber: "", quantity: 1, unitPrice: undefined, vendor: "", link: "", notes: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit = (data: RequestFormValues) => {
    console.log(data);
    toast.success("Request submitted successfully!", {
      description: `Title: ${data.requestTitle}`,
    });
    // In a real application, you would send this data to your backend.
    // For file uploads, you'd typically use FormData and a separate API endpoint.
    form.reset(); // Reset form after submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="requestTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Request Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Antibodies for Project X" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="projectCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Code (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., P12345" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <h2 className="text-xl font-semibold mt-8 mb-4">Items</h2>
        <div className="space-y-6">
          {fields.map((field, index) => (
            <div key={field.id} className="border p-4 rounded-md relative">
              <h3 className="text-lg font-medium mb-4">Item #{index + 1}</h3>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => remove(index)}
                  className="absolute top-4 right-4"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`items.${index}.productName`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Anti-GFP Antibody" {...itemField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.catalogNumber`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Catalog Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ab12345" {...itemField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" {...itemField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.unitPrice`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Unit Price (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 120.50" {...itemField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.vendor`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Vendor (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Thermo Fisher" {...itemField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.link`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Product Link (Optional)</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="e.g., https://www.vendor.com/product" {...itemField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.notes`}
                  render={({ field: itemField }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any specific requirements or details..." {...itemField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({ productName: "", catalogNumber: "", quantity: 1, unitPrice: undefined, vendor: "", link: "", notes: "" })
          }
          className="w-full"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
        </Button>

        <h2 className="text-xl font-semibold mt-8 mb-4">Attachments (Optional)</h2>
        <FormField
          control={form.control}
          name="attachments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Upload Files (e.g., Quotes, PDFs)</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => field.onChange(e.target.files)}
                />
              </FormControl>
              <FormMessage />
              <p className="text-sm text-muted-foreground">
                Note: File uploads require a backend to store the files. This is a placeholder.
              </p>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">Submit Request</Button>
      </form>
    </Form>
  );
};

export default RequestForm;