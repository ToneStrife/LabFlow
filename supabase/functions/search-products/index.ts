import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mock Product Database (copied from src/data/mockData.ts for server-side simulation)
const productDatabase = [
  {
    id: "pdt1",
    productName: "E. coli DH5a Competent Cells",
    catalogNumber: "18265017",
    unitPrice: 150.00,
    format: "10x 50µl",
    link: "https://www.thermofisher.com/order/catalog/product/18265017",
    brand: "Invitrogen",
  },
  {
    id: "pdt2",
    productName: "DMEM, high glucose, GlutaMAX Supplement, pyruvate",
    catalogNumber: "11965092",
    unitPrice: 35.50,
    format: "500 mL",
    link: "https://www.thermofisher.com/order/catalog/product/11965092",
    brand: "Gibco",
  },
  {
    id: "pdt3",
    productName: "Anti-GFP Antibody (Rabbit Polyclonal)",
    catalogNumber: "ab12345",
    unitPrice: 120.50,
    format: "100 µl",
    link: "https://www.abcam.com/anti-gfp-antibody-ab12345.html",
    brand: "Abcam",
  },
  {
    id: "pdt4",
    productName: "Anti-GFP Antibody (Mouse Monoclonal)",
    catalogNumber: "ab12345",
    unitPrice: 130.00,
    format: "50 µl",
    link: "https://www.bio-rad.com/anti-gfp-antibody-ab12345.html",
    brand: "Bio-Rad",
  },
  {
    id: "pdt5",
    productName: "Taq DNA Polymerase",
    catalogNumber: "P2000",
    unitPrice: 50.00,
    format: "500 units",
    link: "https://www.sigmaaldrich.com/P2000",
    brand: "Sigma-Aldrich",
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid query provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Simulate AI/Fuzzy search logic
    const matches = productDatabase.filter(p => {
      const nameMatch = p.productName.toLowerCase().includes(normalizedQuery);
      const catMatch = p.catalogNumber.toLowerCase().includes(normalizedQuery);
      const brandMatch = p.brand.toLowerCase().includes(normalizedQuery);
      
      return nameMatch || catMatch || brandMatch;
    });

    // Simulate network delay for AI processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    return new Response(JSON.stringify({ products: matches }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});