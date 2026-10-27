import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface GeminiMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export interface GeminiResponse {
  text: string;
  model: string;
  latencyMs: number;
}

class GeminiService {
  private getApiKey(): string {
    const key = (process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY || '').trim();
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured in server environment. Please set GEMINI_API_KEY in server/.env');
    }
    return key;
  }

  /**
   * Check if Gemini API key is configured without exposing its value
   */
  isConfigured(): boolean {
    const key = (process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY || '').trim();
    return key.length > 0;
  }

  /**
   * Sanitize untrusted user prompt to defend against prompt injection
   */
  sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '') // remove control chars
      .trim();
  }

  /**
   * Call Gemini Generative Language API
   */
  async generateText(
    prompt: string,
    systemInstruction?: string,
    options?: {
      temperature?: number;
      maxOutputTokens?: number;
      candidateCount?: number;
      model?: string;
    }
  ): Promise<GeminiResponse> {
    const apiKey = this.getApiKey();
    const startTime = Date.now();
    const primaryModel = options?.model || 'gemini-robotics-er-2-preview';
    const fallbackModels = ['gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-2.5-flash'];

    const payload: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: options?.temperature !== undefined ? options.temperature : 0.2,
        maxOutputTokens: options?.maxOutputTokens || 2048
      }
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const modelsToTry = options?.model 
      ? [options.model, ...fallbackModels.filter(m => m !== options.model)]
      : [primaryModel, ...fallbackModels];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 12000 // 12s timeout for fast, seamless failover
        });

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Received empty response from Gemini model candidate');
        }

        const latencyMs = Date.now() - startTime;
        return {
          text,
          model,
          latencyMs
        };
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status;
        const msg = err.response?.data?.error?.message || err.message;
        console.warn(`[GEMINI SERVICE] Attempt with ${model} failed (${status || 'Network/Timeout'}): ${msg}`);

        // If rate limited or quota exceeded, try fallback or rethrow
        if (status === 429) {
          console.warn('[GEMINI SERVICE] Quota / Rate limit reached. Trying next model if available.');
        }
      }
    }

    // If all models failed, handle gracefully
    const errorMessage = lastError?.response?.data?.error?.message || lastError?.message || 'Gemini API communication failure';
    console.error('[GEMINI SERVICE ERROR]', errorMessage);
    throw new Error(`AI Service currently unavailable: ${errorMessage}`);
  }
}

export const geminiService = new GeminiService();
