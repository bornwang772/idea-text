import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Sparkles, Settings as SettingsIcon, Lightbulb, Clock, Search, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeData, LinkData, ApiConfig, HistoryItem } from './types';
import { Graph } from './components/Graph';
import { ContextMenu } from './components/ContextMenu';
import { SettingsModal } from './components/SettingsModal';
import { IdeaPanel } from './components/IdeaPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { FavoritesPanel } from './components/FavoritesPanel';
import { fetchAssociations, fetchTranslation, generateIdeas } from './services/api';

const DEFAULT_CONFIG: ApiConfig = {
  provider: 'gemini',
  apiKey: process.env.GEMINI_API_KEY || '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'gemini-3.1-flash-lite-preview',
  expandPrompt: '你是一个创意发散助手。请根据给定的词语，联想出7-8个相关的词语或短语。只返回词语，用逗号分隔，不要有其他解释。尽量提供有网感、新颖的词汇。',
  ideaPrompt: '你是一个创意策划专家。请根据以下选中的词语，生成3个有创意的方案或点子。要求新颖、有趣、有网感。',
};

export default function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [links, setLinks] = useState<LinkData[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isInitial, setIsInitial] = useState(true);
  
  const [config, setConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIdeaPanelOpen, setIsIdeaPanelOpen] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [isFavoritesPanelOpen, setIsFavoritesPanelOpen] = useState(false);
  
  const [ideas, setIdeas] = useState('');
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: NodeData | null }>({ x: 0, y: 0, node: null });
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load history from local storage
  useEffect(() => {
    const savedHistory = localStorage.getItem('creative-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
    const savedConfig = localStorage.getItem('creative-config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Failed to parse config', e);
      }
    }
    const savedFavorites = localStorage.getItem('creative-favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Failed to parse favorites', e);
      }
    }
  }, []);

  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('creative-history', JSON.stringify(newHistory));
  };

  const saveConfig = (newConfig: ApiConfig) => {
    setConfig(newConfig);
    localStorage.setItem('creative-config', JSON.stringify(newConfig));
  };

  const saveFavorites = (newFavorites: string[]) => {
    setFavorites(newFavorites);
    localStorage.setItem('creative-favorites', JSON.stringify(newFavorites));
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const rootNode: NodeData = {
      id: uuidv4(),
      text: inputValue.trim(),
      isRoot: true,
      isSelected: false,
      isExpanded: false,
      isLoading: true,
      depth: 0,
      x: dimensions.width / 2,
      y: dimensions.height / 2,
    };

    setNodes([rootNode]);
    setLinks([]);
    setIsInitial(false);
    setInputValue('');

    await expandNode(rootNode);
  };

  const expandNode = async (node: NodeData) => {
    if (node.isExpanded || node.isLoading && !node.isRoot) return;

    setNodes(prev => prev.map(n => n.id === node.id ? { ...n, isLoading: true } : n));

    try {
      const newWords = await fetchAssociations(node.text, config);
      
      const newNodes: NodeData[] = newWords.map((word, i) => {
        // Spawn exactly at the parent's current position to create an explosion effect
        // The physics engine will naturally push them apart
        const x = node.x || dimensions.width / 2;
        const y = node.y || dimensions.height / 2;
        
        return {
          id: uuidv4(),
          text: word,
          isRoot: false,
          isSelected: false,
          isExpanded: false,
          isLoading: false,
          depth: (node.depth || 0) + 1,
          x,
          y,
        };
      });

      const newLinks: LinkData[] = newNodes.map(n => ({
        source: node.id,
        target: n.id,
      }));

      setNodes(prev => {
        const updated = prev.map(n => n.id === node.id ? { ...n, isLoading: false, isExpanded: true } : n);
        return [...updated, ...newNodes];
      });
      
      setLinks(prev => [...prev, ...newLinks]);

      // Save to history if it's the root node expansion
      if (node.isRoot) {
        const newHistoryItem: HistoryItem = {
          id: uuidv4(),
          timestamp: Date.now(),
          rootWord: node.text,
          nodes: [...nodes, ...newNodes],
          links: [...links, ...newLinks],
        };
        saveHistory([newHistoryItem, ...history].slice(0, 50));
      }

    } catch (error) {
      console.error(error);
      setNodes(prev => prev.map(n => n.id === node.id ? { ...n, isLoading: false } : n));
      alert('获取联想词失败，请检查 API 设置。');
    }
  };

  const handleNodeClick = (node: NodeData) => {
    setNodes(prev => prev.map(n => 
      n.id === node.id ? { ...n, isSelected: !n.isSelected } : n
    ));
  };

  const handleNodeDoubleClick = (node: NodeData) => {
    if (!node.isExpanded) {
      expandNode(node);
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, node: NodeData) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const toggleNodeSelection = () => {
    if (!contextMenu.node) return;
    setNodes(prev => prev.map(n => 
      n.id === contextMenu.node!.id ? { ...n, isSelected: !n.isSelected } : n
    ));
  };

  const toggleFavorite = () => {
    if (!contextMenu.node) return;
    const word = contextMenu.node.text;
    if (favorites.includes(word)) {
      saveFavorites(favorites.filter(w => w !== word));
    } else {
      saveFavorites([...favorites, word]);
      setIsFavoritesPanelOpen(true);
    }
  };

  const translateNode = async () => {
    if (!contextMenu.node) return;
    const nodeId = contextMenu.node.id;
    
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isLoading: true } : n));
    
    try {
      const translation = await fetchTranslation(contextMenu.node.text, config);
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, translation, isLoading: false } : n));
    } catch (error) {
      console.error(error);
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isLoading: false } : n));
      alert('翻译失败，请检查 API 设置。');
    }
  };

  const handleGenerateIdeas = async () => {
    const selectedWords = nodes.filter(n => n.isSelected).map(n => n.text);
    if (selectedWords.length === 0) return;

    setIsGeneratingIdeas(true);
    try {
      const result = await generateIdeas(selectedWords, config);
      setIdeas(result);
    } catch (error) {
      console.error(error);
      alert('生成创意失败，请检查 API 设置。');
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    // Ensure depth exists for backward compatibility
    const nodesWithDepth = item.nodes.map(n => ({
      ...n,
      depth: n.depth !== undefined ? n.depth : (n.isRoot ? 0 : 1)
    }));
    setNodes(nodesWithDepth);
    setLinks(item.links);
    setIsInitial(false);
    setIdeas('');
  };

  const selectedWords = nodes.filter(n => n.isSelected).map(n => n.text);

  return (
    <div className="relative w-full h-screen bg-slate-50 overflow-hidden font-sans" ref={containerRef}>
      {/* Background grid */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMCwgMCwgMCwgMC4wNSkiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none" />

      {/* Top Navigation */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-30 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-10 h-10 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-400/20">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 mr-4">创意发散助手</h1>
          
          <button
            onClick={() => setIsFavoritesPanelOpen(!isFavoritesPanelOpen)}
            className="px-4 py-2.5 bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl text-sm font-medium text-gray-700 hover:bg-yellow-50 hover:text-yellow-900 hover:border-yellow-200 transition-all shadow-sm flex items-center gap-2"
          >
            <Star className="w-4 h-4" />
            收藏夹
            {favorites.length > 0 && (
              <span className="w-5 h-5 bg-yellow-400 text-black rounded-full flex items-center justify-center text-xs font-bold">
                {favorites.length}
              </span>
            )}
          </button>
        </div>
        
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => setIsIdeaPanelOpen(true)}
            className="px-4 py-2.5 bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl text-sm font-medium text-gray-700 hover:bg-yellow-50 hover:text-yellow-900 hover:border-yellow-200 transition-all shadow-sm flex items-center gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            创意方案
            {selectedWords.length > 0 && (
              <span className="w-5 h-5 bg-yellow-400 text-black rounded-full flex items-center justify-center text-xs font-bold">
                {selectedWords.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setIsHistoryPanelOpen(true)}
            className="p-2.5 bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
          >
            <Clock className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Graph Area */}
      {!isInitial && (
        <Graph
          nodes={nodes}
          links={links}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeContextMenu={handleNodeContextMenu}
          width={dimensions.width}
          height={dimensions.height}
        />
      )}

      {/* Input Area */}
      <AnimatePresence>
        <motion.div
          layout
          initial={false}
          animate={{
            top: isInitial ? '50%' : 'auto',
            bottom: isInitial ? 'auto' : '40px',
            y: isInitial ? '-50%' : '0%',
            scale: isInitial ? 1.1 : 1,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-6"
        >
          <form onSubmit={handleInitialSubmit} className="relative group">
            <div className={`absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full transition-opacity duration-500 ${isInputFocused ? 'opacity-100' : 'opacity-0'}`} />
            <div className="relative flex items-center bg-white/80 backdrop-blur-2xl border border-gray-200/50 rounded-full shadow-2xl overflow-hidden p-2 transition-all duration-300 hover:shadow-yellow-400/10">
              <div className="pl-4 pr-2 text-gray-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="输入词语或短句开始发散..."
                className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder:text-gray-400 text-lg py-3 px-2"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-black/10 flex items-center gap-2"
              >
                开始发散
              </button>
            </div>
          </form>
        </motion.div>
      </AnimatePresence>

      {/* Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={!!contextMenu.node}
        onClose={() => setContextMenu({ ...contextMenu, node: null })}
        onSelect={toggleNodeSelection}
        onTranslate={translateNode}
        onFavorite={toggleFavorite}
        isSelected={contextMenu.node?.isSelected || false}
        isFavorited={contextMenu.node ? favorites.includes(contextMenu.node.text) : false}
      />

      {/* Modals & Panels */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={saveConfig}
      />

      <IdeaPanel
        isOpen={isIdeaPanelOpen}
        onClose={() => setIsIdeaPanelOpen(false)}
        ideas={ideas}
        isLoading={isGeneratingIdeas}
        selectedWords={selectedWords}
        onGenerate={handleGenerateIdeas}
      />

      <HistoryPanel
        isOpen={isHistoryPanelOpen}
        onClose={() => setIsHistoryPanelOpen(false)}
        history={history}
        onSelect={loadHistoryItem}
      />

      <FavoritesPanel
        isOpen={isFavoritesPanelOpen}
        onClose={() => setIsFavoritesPanelOpen(false)}
        favorites={favorites}
        onRemove={(word) => saveFavorites(favorites.filter(w => w !== word))}
      />
    </div>
  );
}
