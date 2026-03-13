import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Languages, X, Star, Trash2, Sparkles } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  onSelect: () => void;
  onDelete?: () => void;
  onExpand?: () => void;
  onTranslate: () => void;
  onFavorite: () => void;
  isSelected: boolean;
  isFavorited: boolean;
  isExpanded?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, isOpen, onClose, onSelect, onTranslate, onFavorite, onDelete, onExpand, isSelected, isFavorited, isExpanded }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{ top: y, left: x }}
        className="fixed z-50 min-w-[160px] bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-2xl overflow-hidden py-1"
      >
        {onExpand && (
          <>
            <button
              onClick={() => { onExpand(); onClose(); }}
              disabled={isExpanded}
              className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors ${
                isExpanded
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-yellow-700 hover:bg-yellow-400/20 hover:text-yellow-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {isExpanded ? '已发散' : '开始发散'}
            </button>
            <div className="h-px bg-gray-200/50 mx-2 my-1" />
          </>
        )}
        <button
          onClick={() => { onSelect(); onClose(); }}
          className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-yellow-400/20 hover:text-yellow-900 flex items-center gap-2 transition-colors"
        >
          {isSelected ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {isSelected ? '取消选择' : '选择词语'}
        </button>
        <div className="h-px bg-gray-200/50 mx-2 my-1" />
        <button
          onClick={() => { onTranslate(); onClose(); }}
          className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-yellow-400/20 hover:text-yellow-900 flex items-center gap-2 transition-colors"
        >
          <Languages className="w-4 h-4" />
          翻译词语
        </button>
        <div className="h-px bg-gray-200/50 mx-2 my-1" />
        <button
          onClick={() => { onFavorite(); onClose(); }}
          className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-yellow-400/20 hover:text-yellow-900 flex items-center gap-2 transition-colors"
        >
          <Star className={`w-4 h-4 ${isFavorited ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          {isFavorited ? '取消收藏' : '加入收藏'}
        </button>
        {onDelete && (
          <>
            <div className="h-px bg-gray-200/50 mx-2 my-1" />
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              删除节点
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
