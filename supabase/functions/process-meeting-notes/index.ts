import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function buildPrompt(
  transcript: string,
  contactName: string,
  contactCompany: string,
  meetingDate: string,
): string {
  return `You are a personal CRM assistant helping someone track their professional networking relationships.

Analyze this meeting transcript from a networking call on ${meetingDate} with ${contactName}${contactCompany ? ` at ${contactCompany}` : ""}.

<transcript>
${transcript.trim()}
</transcript>

Extract exactly three categories of information and respond with ONLY a valid JSON object — no markdown fences, no text outside the JSON.

{
  "suggested_title": "<short label for this meeting, e.g. 'Coffee chat' or 'Intro call'>",
  "fun_facts": [
    "<interesting personal detail about ${contactName} that humanizes them — hobbies, background, family, fun story they told, etc.>"
  ],
  "action_items": [
    "<specific thing YOU need to do as a follow-up — be concrete, e.g. 'Send them the McKinsey article on tech strategy' or 'Intro them to Sarah at Deloitte'>",
  ],
  "important_details": [
    "<professional context worth remembering — their current role, career goals, what they're working on, their perspective on the industry, etc.>"
  ]
}

Rules:
- Each array should have 1–4 items. Omit a category entirely if the transcript has no relevant content for it (use an empty array []).
- Be specific and concrete, not generic. Capture details that will be genuinely useful 6 months from now.
- Fun facts should be memorable human details, not professional info.
- Action items should be actionable by you, not vague intentions.
- Important details should be substantive professional context, not trivial observations.
- If the transcript is too short or unclear to extract meaningful info, return whatever you can with short arrays.`;
}

function formatNotesFromResult(result: {
  fun_facts: string[];
  action_items: string[];
  important_details: string[];
}, meetingDate: string): string {
  const lines: string[] = [];

  lines.push(`📅 ${meetingDate}`);
  lines.push("");

  if (result.fun_facts.length > 0) {
    lines.push("✨ Fun Facts");
    for (const f of result.fun_facts) lines.push(`• ${f}`);
    lines.push("");
  }

  if (result.action_items.length > 0) {
    lines.push("📋 Action Items");
    for (const a of result.action_items) lines.push(`• ${a}`);
    lines.push("");
  }

  if (result.important_details.length > 0) {
    lines.push("💡 Important Details");
    for (const d of result.important_details) lines.push(`• ${d}`);
  }

  return lines.join("\n").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // ── Auth: reject unauthenticated callers before spending Anthropic API credits ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing Authorization header" }, 401);
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      transcript = "",
      contact_name = "",
      contact_company = "",
      meeting_date = new Date().toISOString().slice(0, 10),
    } = body as {
      transcript?: string;
      contact_name?: string;
      contact_company?: string;
      meeting_date?: string;
    };

    if (!transcript?.trim()) {
      return json({ error: "transcript is required" }, 400);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "ANTHROPIC_API_KEY is not configured in Supabase secrets." }, 500);
    }

    const prompt = buildPrompt(transcript, contact_name, contact_company, meeting_date);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Anthropic API error (${anthropicRes.status}): ${errText}`);
    }

    const anthropicData = await anthropicRes.json();
    const rawText: string = anthropicData.content?.[0]?.text ?? "";

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Model did not return parseable JSON. Raw: " + rawText.slice(0, 200));
    }

    const result = JSON.parse(jsonMatch[0]);
    const formattedNotes = formatNotesFromResult(result, meeting_date);

    return json({
      suggested_title: result.suggested_title ?? "",
      fun_facts: result.fun_facts ?? [],
      action_items: result.action_items ?? [],
      important_details: result.important_details ?? [],
      formatted_notes: formattedNotes,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
