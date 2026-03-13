export interface NodeData {
  id: string;
  text: string;
  translation?: string;
  isRoot: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  depth?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface LinkData {
  source: string | NodeData;
  target: string | NodeData;
}

export interface ApiConfig {
  provider: 'deepseek' | 'gemini' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
  expandPrompt: string;
  ideaPrompt: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  rootWord: string;
  nodes: NodeData[];
  links: LinkData[];
}
