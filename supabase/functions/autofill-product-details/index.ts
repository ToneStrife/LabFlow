import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// A mock database of products to simulate the AI fetching data
const productDatabase = {
  "18265017": {
    productName: "E. coli DH5a Competent Cells",
    unitPrice: 150.00,
    format: "10x 50µl",
    link: "https://www.thermofisher.com/order/catalog/product/18265017",
    brand: "Invitrogen",
  },
  "11965092": {
    productName: "DMEM, high glucose, GlutaMAX Supplement, pyruvate",
    unitPrice: 35.50,
    format: "500 mL",
    link: "https://www.thermofisher.com/order/catalog/product/11965092",
    brand: "Gibco",
  },
  "ab12345": {
    productName: "Anti-GFP Antibody (Rabbit Polyclonal)",
    unitPrice: 120.50,
    format: "100 µl",
    link: "https://www.abcam.com/anti-gfp-antibody-ab12345.html",
    brand: "Abcam",
  },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { catalogNumber } = await req.json();

    if (!catalogNumber) {
      throw new Error("catalogNumber is required");
    }

    // Find the product in our mock database
    const productDetails = productDatabase[catalogNumber];

    if (!productDetails) {
      return new Response(JSON.stringify({ error: `Product with catalog number '${catalogNumber}' not found.` }), {
        status: 404,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(JSON.stringify(productDetails), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});