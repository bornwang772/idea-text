import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { ApiConfig } from '../types';

// Demo mock data pools for when no API key is configured
function getMockAssociations(word: string): string[] {
  // Curated creative, trendy, internet-savvy word associations
  const pools: Record<string, string[]> = {
    // Chinese words
    '创意': ['脑洞大开', '灵感爆发', 'Aha时刻', '跨界混搭', '整活儿', '二创', '神仙操作', '天马行空'],
    '设计': ['像素级', '强迫症福音', '高级感', '留白美学', '氛围感', '赛博朋克', '毛玻璃', '暗黑模式'],
    '科技': ['赛博格', 'AI觉醒', '数字游民', '硅基生命', '量子纠缠', '脑机接口', '虚拟分身', 'AGI'],
    '美食': ['干饭人', '舌尖暴击', '碳水炸弹', '神仙搭配', '深夜放毒', '快乐老肥宅', '满分推荐', '好吃到哭'],
    '音乐': ['耳朵怀孕', 'DNA动了', '单曲循环', '破防了', '氛围感', '白噪音', '脑内BGM', '音浪'],
    '生活': ['精神状态', 'city walk', '搭子文化', '松弛感', '多巴胺穿搭', '断舍离', '内卷躺平', 'gap year'],
    '工作': ['内卷', '摸鱼', '甲方爸爸', '打工人', '卷不动了', '早C晚A', '躺平学', '副业刚需'],
    '运动': ['多巴胺', '跑者高潮', '核心力量', '公园20分钟', '暴汗', '自律即自由', '身材管理', '运动搭子'],
    '旅行': ['特种兵旅游', '反向旅游', '小众秘境', 'citywalk', '旅行搭子', '说走就走', '出片率', '松弛感'],
    '电影': ['封神了', '二刷三刷', '导演请收下膝盖', 'yyds', '泪目了', '名场面', '高能预警', '沉浸式体验'],
    '爱情': ['双向奔赴', '心动瞬间', '甜蜜暴击', 'be美学', '上头了', '嗑生嗑死', '意难平', '白月光'],
    '学习': ['知识焦虑', '费曼学习法', '碎片时间', '知识图谱', '终身学习', '认知升级', '硬核干货', '信息茧房'],
    // English words
    'idea': ['eureka', 'mindmap', 'brainstorm', 'epiphany', 'remix', 'mashup', 'pivot', 'moonshot'],
    'design': ['glassmorphism', 'dark mode', 'neobrutalism', 'bento grid', 'micro-interaction', 'motion design', 'design system', 'pixel perfect'],
    'tech': ['vibe coding', 'AI agent', 'prompt engineering', 'RAG', 'fine-tuning', 'open source', 'edge computing', 'web3'],
    'music': ['lo-fi beats', 'playlist', 'earworm', 'remix culture', 'beat drop', 'acoustic', 'synthwave', 'ASMR'],
    'food': ['food coma', 'comfort food', 'umami bomb', 'fusion cuisine', 'chef\'s kiss', 'brunch vibes', 'street eats', 'gastronomy'],
    'test': ['vibe check', 'reality check', 'benchmark', 'smoke test', 'stress test', 'sanity check', 'litmus test', 'acid test'],
    'love': ['butterflies', 'soulmate', 'spark', 'chemistry', 'situationship', 'slow burn', 'meet-cute', 'rom-com'],
    'work': ['hustle culture', 'side quest', 'burnout', 'flow state', 'deep work', 'async', 'remote life', 'passion project'],
  };
  
  if (pools[word]) return pools[word];
  
  // For unknown words: pick from themed generic pools based on character detection
  const isChinese = /[\u4e00-\u9fff]/.test(word);
  
  if (isChinese) {
    // Randomly pick from various Chinese creative pools
    const allChinese = [
      '脑洞大开', '破防了', '绝绝子', 'yyds', '神仙操作',
      '整活大师', '赛博朋克', '多巴胺', '氛围感拉满', '上头了',
      '格局打开', '降维打击', '反向操作', '沉浸式体验', '通感联觉',
      '碎片化', '信息茧房', '跨界融合', '去中心化', '共创',
      '情绪价值', '松弛感', '钝感力', '心流状态', '认知升级',
    ];
    // Pick 8 random ones
    const shuffled = allChinese.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8);
  } else {
    const allEnglish = [
      'vibe shift', 'main character energy', 'side quest', 'deep dive',
      'hot take', 'plot twist', 'power move', 'mic drop',
      'galaxy brain', 'big mood', 'chef\'s kiss', 'game changer',
      'paradigm shift', 'rabbit hole', 'hack', 'manifesto',
      'aesthetic', 'remix', 'mashup', 'zeitgeist',
      'flow state', 'moonshot', 'epiphany', 'disruption',
    ];
    const shuffled = allEnglish.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8);
  }
}

export async function fetchAssociations(word: string, config: ApiConfig): Promise<string[]> {
  // Demo mode: if no API key, return mock data
  if (!config.apiKey || config.apiKey.trim() === '') {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network delay
    return getMockAssociations(word);
  }

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
