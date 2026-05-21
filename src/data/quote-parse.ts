/** Line item extracted from a quote/budget PDF via Gemini. */
export interface ParsedQuoteItem {
  productName: string;
  catalogNumber: string;
  quantity: number;
  unitPrice: number | null;
  format: string | null;
  link: string | null;
  notes: string | null;
  brand: string | null;
}

export interface ParseQuotePdfResponse {
  items: ParsedQuoteItem[];
}
