// Returns a signed URL for documents that still live in the legacy storage bucket.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { path } = await req.json();
    if (!path || typeof path !== "string") {
      return new Response(JSON.stringify({ error: "path required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const legacyUrl = Deno.env.get("LEGACY_SB_URL")!;
    const legacyKey = Deno.env.get("LEGACY_SB_SERVICE_KEY")!;

    const res = await fetch(
      `${legacyUrl}/storage/v1/object/sign/company-documents/${path.split("/").map(encodeURIComponent).join("/")}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${legacyKey}`,
          apikey: legacyKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 120 }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: text }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    const signedUrl = `${legacyUrl}/storage/v1${json.signedURL}`;
    return new Response(JSON.stringify({ signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
