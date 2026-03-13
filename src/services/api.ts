import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { ApiConfig } from '../types';

export async function fetchAssociations(word: string, config: ApiConfig): Promise<string[]> {
  const prompt = `${config.expandPrompt}\n\n当前词语：${word}`;

  try {
    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      const response = await ai.models.generateContent({
        model: config.model || 'gemini-3.1-flash-lite-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });
      return parseWords(response.text || '');
    } else {
      // DeepSeek or Custom OpenAI compatible
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: config.expandPrompt },
            { role: 'user', content: `当前词语：${word}` }
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      return parseWords(content);
    }
  } catch (error) {
    console.error('Failed to fetch associations:', error);
    throw error;
  }
}

export async function fetchTranslation(word: string, config: ApiConfig): Promise<string> {
  const prompt = `请将以下词语翻译成英文，只返回翻译结果，不要有任何解释或标点符号：\n\n${word}`;

  try {
    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      const response = await ai.models.generateContent({
        model: config.model || 'gemini-3.1-flash-lite-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });
      return (response.text || '').trim();
    } else {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.choices?.[0]?.message?.content || '').trim();
    }
  } catch (error) {
    console.error('Failed to fetch translation:', error);
    throw error;
  }
}

export async function generateIdeas(words: string[], config: ApiConfig): Promise<string> {
  const prompt = `${config.ideaPrompt}\n\n选中的词语：${words.join('、')}`;

  try {
    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      const response = await ai.models.generateContent({
        model: config.model || 'gemini-3.1-pro-preview',
        contents: prompt,
      });
      return response.text || '';
    } else {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: config.ideaPrompt },
            { role: 'user', content: `选中的词语：${words.join('、')}` }
          ],
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }
  } catch (error) {
    console.error('Failed to generate ideas:', error);
    throw error;
  }
}

function parseWords(text: string): string[] {
  // Try to split by commas, newlines, or spaces, and clean up
  const cleaned = text.replace(/[。，、]/g, ',');
  const words = cleaned.split(/[\n,]+/).map(w => w.trim().replace(/^[0-9.\- ]+/, '')).filter(w => w.length > 0);
  // Return up to 8 words
  return Array.from(new Set(words)).slice(0, 8);
}
