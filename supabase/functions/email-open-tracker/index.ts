import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1×1 transparent GIF (43 bytes) — standard tracking pixel
const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

// Always returns the pixel — never surfaces errors to the email client
serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("t");

    if (token) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // unauthenticated update via service role
      );

      // Only advance from "sent" → "opened"; ignore already-opened or skipped rows
      await supabase
        .from("scheduled_outreach")
        .update({
          status: "opened",
          opened_at: new Date().toISOString(),
        })
        .eq("tracking_token", token)
        .eq("status", "sent");
    }
  } catch {
    // Silently swallow errors — recipient must always get the pixel
  }

  return new Response(TRANSPARENT_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
    },
  });
});
