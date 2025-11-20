
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

export interface FileVersion {
  timestamp: number;
  content: string;
  label?: string;
}

export interface ProjectFile {
  filename: string;
  language: string;
  content: string;
  history?: FileVersion[];
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] || '' });
  }

  async enhancePrompt(originalPrompt: string): Promise<string> {
    try {
      const model = 'gemini-2.5-flash';
      const systemInstruction = `You are an expert UI/UX Prompt Engineer. Your goal is to take a simple, vague, or short user description for a website and rewrite it into a highly detailed, professional design prompt suitable for an AI Website Builder.
      
      Rules:
      1. Keep the core idea of the user's request.
      2. Expand on visual style (e.g., glassmorphism, brutalism, minimalism).
      3. Suggest specific color palettes (e.g., "deep indigo with neon accents").
      4. Define specific sections (Hero with CTA, Features grid, Testimonials, Footer).
      5. Mention layout specifics (responsive grid, sticky header).
      6. Output ONLY the raw text of the improved prompt. Do not add "Here is the prompt:" or quotes.
      7. If the input is empty, invent a creative, trending website concept.
      
      Input: "${originalPrompt}"`;

      const response = await this.ai.models.generateContent({
        model: model,
        contents: originalPrompt || 'Generate a creative website concept',
        config: {
          systemInstruction: systemInstruction,
        }
      });

      return response.text?.trim() || originalPrompt;
    } catch (error) {
      console.error('Prompt enhancement error:', error);
      return originalPrompt; // Fallback to original if error
    }
  }

  async generateProject(prompt: string, hasCustomImage: boolean): Promise<ProjectFile[]> {
    try {
      const model = 'gemini-2.5-flash';
      
      const imageInstruction = hasCustomImage 
        ? `IMPORTANT: The user has uploaded a custom image. You MUST use the exact placeholder "{{CUSTOM_IMAGE_PLACEHOLDER}}" for the src attribute of the most prominent image in the design (e.g., the website Logo, or the main Hero background/image). Prioritize using it as a Logo if the context implies a brand, otherwise use it as a Hero image. Do NOT use a picsum URL for this specific element.` 
        : '';

      // Optimized instruction to keep output size within limits
      const systemInstruction = `You are an expert full-stack developer and UI/UX designer.
      Your task is to generate a multi-file project based on the user's request.
      
      Files to generate:
      1. 'index.html': Responsive website with Tailwind CSS. High quality but concise.
      2. 'styles.css': Custom CSS (max 50 lines).
      3. 'script.js': Interactive JS (max 50 lines).
      4. 'server.py': Python backend stub (max 30 lines).
      5. 'App.java': Java backend stub (max 30 lines).
      6. 'config.json': Simple config.

      Requirements:
      - Use <script src="https://cdn.tailwindcss.com"></script>.
      - Include placeholder images from 'https://picsum.photos/seed/{random}/800/600'.
      - ${imageInstruction}
      - CRITICAL: Keep code concise to avoid response truncation. Use placeholders for long text sections. Do not generate extremely large files.
      
      Return the response as a JSON Object containing an array of files.
      `;

      const response = await this.ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              files: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    filename: { type: Type.STRING },
                    language: { type: Type.STRING, description: "language identifier like html, css, python, java, json" },
                    content: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      let jsonStr = response.text?.trim();
      if (!jsonStr) throw new Error("No response from AI");

      // Robust cleanup for markdown code blocks
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(jsonStr);
      
      // Initialize empty history for new files
      const files: ProjectFile[] = parsed.files || [];
      return files.map(f => ({ ...f, history: [] }));

    } catch (error) {
      console.error('Gemini generation error:', error);
      throw error;
    }
  }
}
