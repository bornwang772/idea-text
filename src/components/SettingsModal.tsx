import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Save } from 'lucide-react';
import { ApiConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSave: (config: ApiConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<ApiConfig>(config);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/20 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="w-full sm:max-w-lg bg-white/90 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden max-h-[90vh] sm:max-h-none flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              API 设置
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型提供商</label>
                <select
                  value={localConfig.provider}
                  onChange={(e) => setLocalConfig({ ...localConfig, provider: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
                >
                  <option value="deepseek">DeepSeek (OpenAI 兼容)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="custom">自定义 (OpenAI 兼容)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={localConfig.apiKey}
                  onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
                  placeholder="输入你的 API Key"
                />
              </div>

              {localConfig.provider !== 'gemini' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                  <input
                    type="text"
                    value={localConfig.baseUrl}
                    onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
                    placeholder="https://api.deepseek.com/v1"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
                <input
                  type="text"
                  value={localConfig.model}
                  onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
                  placeholder={localConfig.provider === 'gemini' ? 'gemini-3.1-flash-lite-preview' : 'deepseek-chat'}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">提示词设置 (Prompt)</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">词语发散提示词</label>
                <textarea
                  value={localConfig.expandPrompt}
                  onChange={(e) => setLocalConfig({ ...localConfig, expandPrompt: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all resize-none"
                  placeholder="例如：生成有网感的词..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">创意生成提示词</label>
                <textarea
                  value={localConfig.ideaPrompt}
                  onChange={(e) => setLocalConfig({ ...localConfig, ideaPrompt: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all resize-none"
                  placeholder="例如：生成3个有趣的营销方案..."
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                onSave(localConfig);
                onClose();
              }}
              className="px-6 py-2.5 text-sm font-medium text-black bg-yellow-400 hover:bg-yellow-500 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-yellow-400/20"
            >
              <Save className="w-4 h-4" />
              保存设置
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
