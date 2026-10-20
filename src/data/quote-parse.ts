/** Línea de producto extraída de un presupuesto (PDF o imagen/captura) con Gemini. */
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
