import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST for this function
};

// Simulated external product database
const simulatedExternalProducts = [
  {
    id: "ext-pdt1",
    productName: "Advanced Cell Culture Medium X",
    catalogNumber: "ACC-001",
    unitPrice: 250.00,
    format: "1L bottle",
    link: "https://www.external-supplier.com/acc-001",
    brand: "BioTech Solutions",
    source: "External Search"
  },
  {
    id: "ext-pdt2",
    productName: "High-Purity DNA Ligase",
    catalogNumber: "DNAL-HP",
    unitPrice: 320.00,
    format: "200 units",
    link: "https://www.external-supplier.com/dnal-hp",
    brand: "Enzyme Innovations",
    source: "External Search"
  },
  {
    id: "ext-pdt3",
    productName: "Fluorescent Microscopy Dye Kit",
    catalogNumber: "FMD-KIT",
    unitPrice: 899.99,
    format: "1 kit",
    link: "https://www.external-supplier.com/fmd-kit",
    brand: "Imaging Pro",
    source: "External Search"
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin actions if needed,
    // but for a simple search, anon key might suffice if RLS is set up.
    // For this example, we'll use the anon key as it's a read-only operation.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '', // Using anon key for read-only search
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Optional: Verify JWT if you want to restrict external search to logged-in users
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      // For a public search, this might be allowed. For now, we'll require it.
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    let payload;
    try {
      const jwtSecret = Deno.env.get('JWT_SECRET');
      if (!jwtSecret) {
        return new Response(JSON.stringify({ error: 'Server configuration error: JWT secret not found.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const encoder = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(jwtSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      payload = await verify(token, cryptoKey, 'HS256');
      // You could check user roles here if needed:
      // const { data: userProfile, error: profileError } = await supabaseClient.from('profiles').select('role').eq('id', payload.sub).single();
      // if (profileError || !userProfile) throw new Error("User profile not found or unauthorized.");
    } catch (jwtError: any) {
      return new Response(JSON.stringify({ error: `Unauthorized: Invalid token - ${jwtError.message}` }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    const { catalogNumber, brand } = await req.json();

    if (!catalogNumber) {
      return new Response(JSON.stringify({ error: 'Missing required field: catalogNumber' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Simulate network delay for external search
    await new Promise(resolve => setTimeout(resolve, 1000));

    const matches = simulatedExternalProducts.filter(p => {
      const catMatch = p.catalogNumber.toLowerCase() === catalogNumber.toLowerCase();
      const brandMatch = !brand || p.brand.toLowerCase().includes(brand.toLowerCase());
      return catMatch && brandMatch;
    });

    console.log(`Edge Function: External search for catalog ${catalogNumber}, brand ${brand} found ${matches.length} matches.`);

    return new Response(JSON.stringify({ products: matches }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function: Unhandled error in search-product:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});