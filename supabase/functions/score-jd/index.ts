import { serve } from "https://deno.land/std@0.177.1/http/server.ts";

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

function buildPrompt(resumeText: string, jdText: string): string {
  const resumeSection = resumeText.trim()
    ? `<resume>\n${resumeText.trim()}\n</resume>`
    : `<resume>No resume provided — score based on JD requirements analysis only. Note in summary that the resume was missing.</resume>`;

  return `You are an expert recruiter and career coach. Score a candidate's fit against a job description.

${resumeSection}

<job_description>
${jdText.trim()}
</job_description>

Analyze the fit and respond with ONLY a valid JSON object — no markdown fences, no text outside the JSON.

{
  "overall_score": <integer 0–100>,
  "label": <"Excellent Match" | "Strong Match" | "Good Match" | "Partial Match" | "Weak Match">,
  "summary": "<2–3 sentence overall assessment, specific to this candidate and role>",
  "strengths": ["<concrete strength 1>", "<concrete strength 2>", "<concrete strength 3>"],
  "gaps": ["<actionable gap 1>", "<actionable gap 2>", "<actionable gap 3>"],
  "sections": [
    { "name": "Technical Skills", "score": <0–100>, "feedback": "<1–2 sentences>" },
    { "name": "Experience Level", "score": <0–100>, "feedback": "<1–2 sentences>" },
    { "name": "Industry & Domain Fit", "score": <0–100>, "feedback": "<1–2 sentences>" },
    { "name": "Key Requirements", "score": <0–100>, "feedback": "<1–2 sentences>" }
  ]
}`;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { resume_text = "", jd_text = "" } = body as {
      resume_text?: string;
      jd_text?: string;
    };

    if (!jd_text?.trim()) {
      return json({ error: "jd_text is required" }, 400);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "ANTHROPIC_API_KEY is not configured in Supabase secrets." }, 500);
    }

    const prompt = buildPrompt(resume_text, jd_text);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
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

    // Extract the JSON object from the response (handles any stray whitespace)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Model did not return parseable JSON. Raw: " + rawText.slice(0, 200));
    }

    const result = JSON.parse(jsonMatch[0]);
    return json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
