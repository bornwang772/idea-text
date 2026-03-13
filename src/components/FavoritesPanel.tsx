import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Trash2 } from 'lucide-react';

interface FavoritesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: string[];
  onRemove: (word: string) => void;
}

export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ isOpen, onClose, favorites, onRemove }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -300 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-x-2 bottom-2 top-16 sm:inset-x-auto sm:left-6 sm:top-24 sm:bottom-24 sm:w-80 bg-white/80 backdrop-blur-2xl border border-gray-200/50 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-40"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100/50 bg-white/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            收藏词库
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {favorites.length === 0 ? (
            <div className="text-center text-gray-400 text-sm mt-10">暂无收藏词语</div>
          ) : (
            favorites.map((word) => (
              <div
                key={word}
                className="w-full text-left p-4 bg-white/60 border border-gray-100/80 rounded-2xl flex items-center justify-between shadow-sm group"
              >
                <span className="font-medium text-gray-900">{word}</span>
                <button
                  onClick={() => onRemove(word)}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
