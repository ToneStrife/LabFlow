import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '', // Usar anon key para operaciones de lectura si RLS lo permite
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verificar el JWT del usuario que llama (asegura que solo usuarios autenticados puedan usar esta función)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
    } catch (jwtError: any) {
      return new Response(JSON.stringify({ error: `Unauthorized: Invalid token - ${jwtError.message}` }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { catalogNumber, brand } = await req.json();

    if (!catalogNumber) {
      return new Response(JSON.stringify({ error: 'Missing required field: catalogNumber' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- AQUÍ ES DONDE INTEGRARÍAS LA LLAMADA A UNA API EXTERNA REAL ---
    // Ejemplo hipotético:
    // const EXTERNAL_API_KEY = Deno.env.get('EXTERNAL_PRODUCT_API_KEY'); // Configura esto como un secreto en Supabase
    // const externalApiUrl = `https://api.hypothetical-product-search.com/v1/products?catalog_number=${catalogNumber}&brand=${brand || ''}&api_key=${EXTERNAL_API_KEY}`;
    
    // const externalApiResponse = await fetch(externalApiUrl, {
    //   headers: {
    //     'Content-Type': 'application/json',
    //     // Otros headers necesarios para la API externa
    //   },
    // });

    // if (!externalApiResponse.ok) {
    //   const errorText = await externalApiResponse.text();
    //   throw new Error(`External API error: ${externalApiResponse.status} - ${errorText}`);
    // }

    // const externalApiData = await externalApiResponse.json();

    // --- TRANSFORMA LOS DATOS DE LA API EXTERNA AL FORMATO ProductDetails ---
    // Esto es crucial. La respuesta de la API externa tendrá su propio formato.
    // Necesitas mapear esos campos a tu interfaz ProductDetails.
    // Ejemplo:
    // const products: ProductDetails[] = externalApiData.results.map((item: any) => ({
    //   id: item.id.toString(),
    //   productName: item.name,
    //   catalogNumber: item.catalog,
    //   unitPrice: item.price,
    //   format: item.packaging,
    //   link: item.url,
    //   brand: item.manufacturer,
    //   source: "External API" // Para indicar de dónde viene el dato
    // }));

    // --- SIMULACIÓN TEMPORAL (REEMPLAZA ESTO CON LA LÓGICA REAL) ---
    // Mientras no tengas una API real, puedes mantener una simulación aquí
    // o simplemente devolver un array vacío si no hay una API configurada.
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simular retraso de red
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

    const matches = simulatedExternalProducts.filter(p => {
      const catMatch = p.catalogNumber.toLowerCase() === catalogNumber.toLowerCase();
      const brandMatch = !brand || p.brand.toLowerCase().includes(brand.toLowerCase());
      return catMatch && brandMatch;
    });
    // --- FIN DE LA SIMULACIÓN TEMPORAL ---

    console.log(`Edge Function: External search for catalog ${catalogNumber}, brand ${brand} found ${matches.length} matches.`);

    return new Response(JSON.stringify({ products: matches }), { // Cambia `matches` por `products` de tu API real
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