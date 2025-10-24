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
import { PlusCircle, Trash2, Check, ChevronsUpDown, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { mockProjects, productDatabase, ProductDetails, RequestItem } from "@/data/mockData";
import { showError, showLoading, dismissToast, showSuccess } from "@/utils/toast";
import { useSession } from "@/components/SessionContextProvider";
import { useVendors } from "@/hooks/use-vendors";
import { useAddRequest } from "@/hooks/use-requests";
import { useAccountManagerProfiles, getFullName } from "@/hooks/use-profiles";

const itemSchema = z.object({
  productName: z.string().min(1, { message: "Product name is required." }),
  catalogNumber: z.string().min(1, { message: "Catalog number is required." }),
  quantity: z.preprocess(
    (val) => Number(val),
    z.number().min(1, { message: "Quantity must be at least 1." })
  ),
  unitPrice: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0, { message: "Unit price cannot be negative." }).optional()
  ),
  format: z.string().optional(),
  link: z.string().url({ message: "Must be a valid URL." }).optional().or(z.literal("")),
  notes: z.string().optional(),
  brand: z.string().optional(),
});

const formSchema = z.object({
  vendorId: z.string().min(1, { message: "Vendor is required." }),
  requesterId: z.string().min(1, { message: "Requester is required." }),
  accountManagerId: z.union([
    z.string().uuid({ message: "Invalid manager ID." }),
    z.literal("unassigned"),
  ]).optional(),
  items: z.array(itemSchema).min(1, { message: "At least one item is required." }),
  attachments: z.any().optional(),
  projectCodes: z.array(z.string()).optional(),
});

type RequestFormValues = z.infer<typeof formSchema>;

const RequestForm: React.FC = () => {
  const { session, profile } = useSession();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: accountManagers, isLoading: isLoadingAccountManagers } = useAccountManagerProfiles();
  const addRequestMutation = useAddRequest();

  const [autofillingIndex, setAutofillingIndex] = React.useState<number | null>(null);
  const [matchingProducts, setMatchingProducts] = React.useState<ProductDetails[]>([]);
  const [selectionIndex, setSelectionIndex] = React.useState<number | null>(null);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendorId: "",
      requesterId: session?.user?.id || "", // Use session.user.id for default
      accountManagerId: "unassigned",
      items: [{ productName: "", catalogNumber: "", quantity: 1, unitPrice: undefined, format: "", link: "", notes: "", brand: "" }],
      projectCodes: [],
    },
  });

  // Update requesterId if session changes after initial render
  React.useEffect(() => {
    if (session?.user?.id) {
      form.setValue("requesterId", session.user.id);
    }
  }, [session, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const applyProductDetails = (index: number, data: ProductDetails) => {
    form.setValue(`items.${index}.productName`, data.productName || '');
    form.setValue(`items.${index}.brand`, data.brand || '');
    form.setValue(`items.${index}.unitPrice`, data.unitPrice || undefined);
    form.setValue(`items.${index}.format`, data.format || '');
    form.setValue(`items.${index}.link`, data.link || '');
  };

  const handleFetchProductDetails = async (index: number) => {
    setAutofillingIndex(index);
    setSelectionIndex(null); // Clear any previous selection state
    setMatchingProducts([]);
    const toastId = showLoading("Searching product database...");

    try {
      const catalogNumber = form.getValues(`items.${index}.catalogNumber`).trim().toLowerCase();
      const brand = form.getValues(`items.${index}.brand`)?.trim().toLowerCase();

      if (!catalogNumber) {
        showError("Please enter a catalog number first.");
        return;
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      const matches = productDatabase.filter(p => {
        const catMatch = p.catalogNumber.toLowerCase() === catalogNumber;
        // If brand is provided, it must be included in the product's brand name (case-insensitive partial match)
        const brandMatch = !brand || p.brand.toLowerCase().includes(brand);
        return catMatch && brandMatch;
      });

      if (matches.length === 0) {
        throw new Error(`Product with catalog number '${catalogNumber}' not found.`);
      }

      if (matches.length === 1) {
        // Single match, autofill immediately
        applyProductDetails(index, matches[0]);
        showSuccess("Product details autofilled!");
      } else {
        // Multiple matches, prompt user for selection
        setMatchingProducts(matches);
        setSelectionIndex(index);
        showSuccess(`${matches.length} matching products found. Please select one.`);
      }

    } catch (error: any) {
      console.error("Error fetching product details:", error);
      showError(error.message || "Could not fetch product details.");
    } finally {
      dismissToast(toastId);
      setAutofillingIndex(null);
    }
  };

  const handleProductSelection = (index: number, productId: string) => {
    const selectedProduct = matchingProducts.find(p => p.id === productId);
    if (selectedProduct) {
      applyProductDetails(index, selectedProduct);
      setSelectionIndex(null);
      setMatchingProducts([]);
      toast.success("Product selected and details applied.");
    }
  };

  const onSubmit = async (data: RequestFormValues) => {
    if (!session?.user?.id) {
      showError("You must be logged in to submit a request.");
      return;
    }

    const requestData = {
      vendorId: data.vendorId,
      requesterId: session.user.id,
      accountManagerId: data.accountManagerId === 'unassigned' ? null : data.accountManagerId,
      notes: undefined, // Notes field is missing in formSchema/form, assuming it's not used here yet
      projectCodes: data.projectCodes,
      items: data.items,
    };

    await addRequestMutation.mutateAsync(requestData);

    // Reset form after successful submission
    form.reset({
      vendorId: "",
      requesterId: session.user.id,
      accountManagerId: "unassigned",
      items: [{ productName: "", catalogNumber: "", quantity: 1, unitPrice: undefined, format: "", link: "", notes: "", brand: "" }],
      projectCodes: [],
    });
  };

  const requesterName = profile ? getFullName(profile) : 'Loading...';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormItem>
            <FormLabel>Requester</FormLabel>
            <FormControl>
              <Input value={requesterName} readOnly disabled />
            </FormControl>
            <FormMessage />
          </FormItem>
          <FormField
            control={form.control}
            name="vendorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingVendors}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingVendors ? "Loading vendors..." : "Select a vendor"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vendors?.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="accountManagerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Manager</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "unassigned"} disabled={isLoadingAccountManagers}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder={isLoadingAccountManagers ? "Loading managers..." : "Select an account manager"} /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="unassigned">No Manager</SelectItem>
                  {accountManagers?.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>{getFullName(manager)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <h2 className="text-xl font-semibold">Items</h2>
        <div className="space-y-6">
          {fields.map((field, index) => (
            <div key={field.id} className="border p-4 rounded-md relative">
              <h3 className="text-lg font-medium mb-4">Item #{index + 1}</h3>
              {fields.length > 1 && (
                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="absolute top-4 right-4">
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
                      <FormControl><Input placeholder="e.g., Anti-GFP Antibody" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.brand`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Brand (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g., Invitrogen" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.catalogNumber`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Catalog Number</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input placeholder="e.g., 18265017" {...itemField} />
                          <Button type="button" variant="outline" size="icon" onClick={() => handleFetchProductDetails(index)} disabled={autofillingIndex === index} title="Autofill product details">
                            {autofillingIndex === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-600" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectionIndex === index && matchingProducts.length > 1 && (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Select Matching Product</FormLabel>
                    <Select onValueChange={(productId) => handleProductSelection(index, productId)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select one of ${matchingProducts.length} matches...`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {matchingProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.productName} ({product.brand}) - ${product.unitPrice?.toFixed(2) || 'N/A'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl><Input type="number" {...itemField} /></FormControl>
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
                      <FormControl><Input type="number" step="0.01" placeholder="e.g., 120.50" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.format`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Format (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g., 200pack 8cs of 25" {...itemField} /></FormControl>
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
                      <FormControl><Input type="url" placeholder="e.g., https://www.vendor.com/product" {...itemField} /></FormControl>
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
                      <FormControl><Textarea placeholder="Any specific requirements or details..." {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" onClick={() => append({ productName: "", catalogNumber: "", quantity: 1, unitPrice: undefined, format: "", link: "", notes: "", brand: "" })} className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
        </Button>
        <h2 className="text-xl font-semibold mt-8 mb-4">Attachments (Optional)</h2>
        <FormField
          control={form.control}
          name="attachments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Upload Files (e.g., Quotes, PDFs)</FormLabel>
              <FormControl><Input type="file" multiple onChange={(e) => field.onChange(e.target.files)} /></FormControl>
              <FormMessage />
              <p className="text-sm text-muted-foreground">Note: File uploads require a backend to store the files. This is a placeholder.</p>
            </FormItem>
          )}
        />
        <h2 className="text-xl font-semibold mt-8 mb-4">Project Codes (Optional)</h2>
        <FormField
          control={form.control}
          name="projectCodes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Associate with Projects</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value || field.value.length === 0 && "text-muted-foreground")}>
                      {field.value && field.value.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {field.value.map((projectId) => {
                            const project = mockProjects.find((p) => p.id === projectId);
                            return project ? <Badge key={projectId} variant="secondary">{project.code}</Badge> : null;
                          })}
                        </div>
                      ) : "Select projects..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search projects..." />
                    <CommandEmpty>No project found.</CommandEmpty>
                    <CommandGroup>
                      {mockProjects.map((project) => (
                        <CommandItem value={project.name} key={project.id} onSelect={() => {
                          const currentValues = field.value || [];
                          if (currentValues.includes(project.id)) {
                            field.onChange(currentValues.filter((id) => id !== project.id));
                          } else {
                            field.onChange([...currentValues, project.id]);
                          }
                        }}>
                          <Check className={cn("mr-2 h-4 w-4", field.value?.includes(project.id) ? "opacity-100" : "opacity-0")} />
                          {project.name} ({project.code})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={addRequestMutation.isPending}>
          {addRequestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Submit Request"}
        </Button>
      </form>
    </Form>
  );
};

export default RequestForm;