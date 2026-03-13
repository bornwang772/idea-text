import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, ChevronRight } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, history, onSelect }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-6 top-24 bottom-24 w-80 bg-white/80 backdrop-blur-2xl border border-gray-200/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-40"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100/50 bg-white/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            历史记录
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {history.length === 0 ? (
            <div className="text-center text-gray-400 text-sm mt-10">暂无历史记录</div>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="w-full text-left p-4 bg-white/60 hover:bg-yellow-50 border border-gray-100/80 rounded-2xl transition-all group flex items-center justify-between shadow-sm"
              >
                <div>
                  <div className="font-medium text-gray-900 mb-1">{item.rootWord}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(item.timestamp).toLocaleString()} · {item.nodes.length} 个节点
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-yellow-500 transition-colors" />
              </button>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
