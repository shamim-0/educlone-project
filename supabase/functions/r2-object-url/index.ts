import { AwsClient } from "npm:aws4fetch@1.0.20";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ENDPOINT = Deno.env.get("R2_S3_ENDPOINT")?.replace(/\/+$/, "");
const ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID");
const SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY");
const BUCKET = Deno.env.get("R2_BUCKET");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!ENDPOINT || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET) {
      return json({ error: "R2 is not configured" }, 500);
    }

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null) as
      | { mode?: string; path?: string; contentType?: string }
      | null;
    const mode = body?.mode;
    const path = (body?.path ?? "").replace(/^\/+/, "");
    if (!mode || !["upload", "download", "delete"].includes(mode)) {
      return json({ error: "Invalid mode" }, 400);
    }
    if (!path || path.includes("..")) return json({ error: "Invalid path" }, 400);

    const client = new AwsClient({
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
      service: "s3",
      region: "auto",
    });

    const objectUrl = `${ENDPOINT}/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;

    if (mode === "delete") {
      const res = await client.fetch(objectUrl, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        const text = await res.text();
        console.error(`R2 delete failed [${res.status}]: ${text}`);
        return json({ error: "Delete failed", status: res.status, details: text }, res.status);
      }
      return json({ ok: true });
    }

    const expires = mode === "upload" ? 300 : 120;
    const method = mode === "upload" ? "PUT" : "GET";
    const signed = await client.sign(`${objectUrl}?X-Amz-Expires=${expires}`, {
      method,
      aws: { signQuery: true, allHeaders: false },
    });

    return json({ url: signed.url, method, expiresIn: expires });
  } catch (e) {
    console.error("r2-object-url error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
