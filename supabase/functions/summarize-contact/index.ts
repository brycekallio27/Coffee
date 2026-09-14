import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
}

interface Meeting {
  id: string;
  meeting_date: string;
  title: string | null;
  notes: string | null;
}

interface RequestBody {
  contact: Contact;
  meetings: Meeting[];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // ── Auth: reject unauthenticated callers before spending Anthropic API credits ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();
    const { contact, meetings } = body;

    if (!contact) {
      return new Response(JSON.stringify({ error: "Contact data is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context from contact and meetings
    const contactName = [contact.first_name, contact.last_name]
      .filter(Boolean)
      .join(" ") || "Unknown";

    const contactInfo = [
      `Name: ${contactName}`,
      contact.title && `Title: ${contact.title}`,
      contact.company && `Company: ${contact.company}`,
      contact.email && `Email: ${contact.email}`,
      contact.linkedin_url && `LinkedIn: ${contact.linkedin_url}`,
    ]
      .filter(Boolean)
      .join("\n");

    const meetingsSummary =
      meetings.length > 0
        ? `Recent meetings:\n${meetings
            .sort(
              (a, b) =>
                new Date(b.meeting_date).getTime() -
                new Date(a.meeting_date).getTime()
            )
            .slice(0, 5)
            .map(
              (m) =>
                `- ${m.meeting_date}: ${m.title || "Meeting"}\n  Notes: ${m.notes || "No notes"}`
            )
            .join("\n")}`
        : "No meetings recorded yet.";

    const prompt = `Based on the following contact information and meeting history, write a concise 2-3 sentence summary of who this person is and what's important to know before reaching out. Focus on their role, company, and any key takeaways from meetings.

Contact Information:
${contactInfo}

${meetingsSummary}

Write the summary in a conversational, friendly tone. Keep it brief and actionable.`;

    // Call Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", error);
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const result = await response.json();
    const summary =
      result.content && result.content.length > 0
        ? result.content[0].text
        : "Unable to generate summary";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
