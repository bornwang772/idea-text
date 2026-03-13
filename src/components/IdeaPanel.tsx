import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Loader2, X } from 'lucide-react';

interface IdeaPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ideas: string;
  isLoading: boolean;
  selectedWords: string[];
  onGenerate: () => void;
}

export const IdeaPanel: React.FC<IdeaPanelProps> = ({ isOpen, onClose, ideas, isLoading, selectedWords, onGenerate }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-x-2 bottom-2 top-16 sm:inset-x-auto sm:right-6 sm:top-24 sm:bottom-24 sm:w-96 bg-white/80 backdrop-blur-2xl border border-gray-200/50 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-40"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100/50 bg-white/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            创意方案
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">已选词语 ({selectedWords.length})</h3>
            <div className="flex flex-wrap gap-2">
              {selectedWords.map((word, i) => (
                <span key={i} className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200">
                  {word}
                </span>
              ))}
              {selectedWords.length === 0 && (
                <span className="text-sm text-gray-400 italic">右键点击节点选择词语</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={onGenerate}
              disabled={selectedWords.length === 0 || isLoading}
              className="w-full py-3 px-4 bg-black text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-black/10"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4" />
                  生成创意方案
                </>
              )}
            </button>

            {ideas && (
              <div className="mt-6 p-4 bg-gray-50/80 rounded-2xl border border-gray-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {ideas}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
