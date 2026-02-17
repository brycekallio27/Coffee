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
