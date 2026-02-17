import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

export async function parsePdfToText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}

export async function parsePdfFromUrl(url: string): Promise<string> {
  const pdf = await pdfjsLib.getDocument(url).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}

export async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("http://localhost:11434/api/tags", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getOllamaModels(): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("http://localhost:11434/api/tags", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m: any) => m.name as string);
  } catch {
    return [];
  }
}

export async function adjustResumeWithOllama(
  resumeText: string,
  jobDescription: string,
  model: string
): Promise<string> {
  const prompt = `You are a resume optimization assistant. A student wants to tailor their resume for a specific job posting.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Analyze the resume against the job description. Suggest targeted keyword and action-verb swaps that better align the resume with the job. Do NOT rewrite the entire resume. Instead, list specific changes in this format:

ORIGINAL: [exact phrase from resume]
SUGGESTED: [improved phrase]
REASON: [brief explanation of why this change helps]

Focus on:
- Action verbs that match the job description's language
- Keywords and skills mentioned in the job posting but missing or weakly stated in the resume
- Quantifiable achievements that could be reframed to match the role
- Industry-specific terminology from the job description

List 5-10 targeted suggestions.`;

  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error: ${err}`);
  }

  const data = await res.json();
  return data.response;
}

export async function fetchLinkedInPreview(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const html = await res.text();
    const extract = (property: string): string | null => {
      const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
        "i"
      );
      const match = html.match(re);
      if (match) return match[1];
      const re2 = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
        "i"
      );
      const match2 = html.match(re2);
      return match2 ? match2[1] : null;
    };

    const title = extract("og:title");
    const description = extract("og:description");
    const parts = [title, description].filter(Boolean);
    return parts.length > 0 ? parts.join("\n") : null;
  } catch {
    return null;
  }
}

export async function personalizeOutreachWithOllama(
  resumeText: string | null,
  contactInfo: string,
  linkedInPreview: string | null,
  currentMessage: string,
  model: string
): Promise<string> {
  let context = "";
  if (resumeText) {
    context += `MY BACKGROUND (from resume):\n${resumeText}\n\n`;
  }
  context += `RECIPIENT INFO:\n${contactInfo}\n\n`;
  if (linkedInPreview) {
    context += `RECIPIENT'S LINKEDIN PROFILE:\n${linkedInPreview}\n\n`;
  }

  const prompt = `You are helping a student personalize a networking outreach message. Use the context below to make the message feel personal, specific, and genuine — not generic.

${context}DRAFT MESSAGE TO PERSONALIZE:
${currentMessage}

Rewrite the message to:
- Reference specific details about the recipient (their role, company, background from LinkedIn)
- Connect the sender's background/interests to the recipient's work where relevant
- Keep the same tone, intent, and approximate length as the draft
- Sound natural and human — not overly formal or robotic
- Replace any placeholder text like [Your Name] with appropriate references

Return ONLY the personalized message text, nothing else.`;

  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error: ${err}`);
  }

  const data = await res.json();
  return data.response;
}
