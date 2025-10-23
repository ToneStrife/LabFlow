"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Loader2, Search, Sparkles } from "lucide-react";
import { ProductDetails } from "@/data/mockData";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const searchSchema = z.object({
  query: z.string().min(3, { message: "Search query must be at least 3 characters." }),
});

type SearchFormValues = z.infer<typeof searchSchema>;

interface ProductSearchProps {
  onProductSelect: (product: ProductDetails) => void;
}

const EDGE_FUNCTION_URL = `https://syuulozqwzveujlgppml.supabase.co/functions/v1/search-products`;

const ProductSearch: React.FC<ProductSearchProps> = ({ onProductSelect }) => {
  const [isSearching, setIsSearching] = React.useState(false);
  const [results, setResults] = React.useState<ProductDetails[]>([]);
  const [selectedProductId, setSelectedProductId] = React.useState<string | null>(null);

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: "",
    },
  });

  const handleSearch = async (data: SearchFormValues) => {
    setIsSearching(true);
    setResults([]);
    setSelectedProductId(null);
    const toastId = showLoading(`Searching for "${data.query}"...`);

    try {
      // We use the standard fetch API for Edge Functions
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: data.query }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Search failed: ${response.status} - ${errorBody.error || 'Server error'}`);
      }

      const result = await response.json();
      const products: ProductDetails[] = result.products || [];

      if (products.length === 0) {
        showError(`No products found matching "${data.query}".`);
      } else {
        setResults(products);
        showSuccess(`${products.length} products found!`);
      }

    } catch (error: any) {
      console.error("AI Search Error:", error);
      showError(error.message || "Failed to perform AI search. Check console for details.");
    } finally {
      dismissToast(toastId);
      setIsSearching(false);
    }
  };

  const handleSelectChange = (productId: string) => {
    setSelectedProductId(productId);
    const selectedProduct = results.find(p => p.id === productId);
    if (selectedProduct) {
      onProductSelect(selectedProduct);
      // Clear search state after successful selection
      setResults([]);
      form.reset();
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-purple-600" /> AI Product Search
        </h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSearch)} className="space-y-4">
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search product name, catalog number, or brand (min 3 chars)..."
                        {...field}
                        disabled={isSearching}
                      />
                      <Button type="submit" disabled={isSearching}>
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {results.length > 0 && (
          <div className="mt-4">
            <Select value={selectedProductId || ""} onValueChange={handleSelectChange}>
              <SelectTrigger>
                <SelectValue placeholder={`Select one of ${results.length} matching products...`} />
              </SelectTrigger>
              <SelectContent>
                {results.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.productName} ({product.brand}) - Cat #: {product.catalogNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductSearch;