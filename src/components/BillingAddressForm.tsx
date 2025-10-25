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
import { Loader2 } from "lucide-react";
import { BillingAddressFormData } from "@/hooks/use-billing-addresses";

const formSchema = z.object({
  name: z.string().min(1, "Name is required."),
  address_line_1: z.string().min(1, "Address is required."),
  address_line_2: z.string().optional(),
  city: z.string().min(1, "City is required."),
  state: z.string().min(1, "State is required."),
  zip_code: z.string().min(1, "Zip code is required."),
  country: z.string().min(1, "Country is required."),
});

interface BillingAddressFormProps {
  initialData?: BillingAddressFormData;
  onSubmit: (data: BillingAddressFormData) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const BillingAddressForm: React.FC<BillingAddressFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const form = useForm<BillingAddressFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      zip_code: "",
      country: "USA",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField name="name" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Address Name</FormLabel><FormControl><Input placeholder="e.g., Finance Department" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="address_line_1" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input placeholder="456 Commerce St" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="address_line_2" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Address Line 2 (Optional)</FormLabel><FormControl><Input placeholder="Floor 7" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField name="city" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="New York" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField name="state" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="NY" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField name="zip_code" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Zip Code</FormLabel><FormControl><Input placeholder="10001" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField name="country" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="USA" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (initialData ? "Save Changes" : "Add Address")}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BillingAddressForm;