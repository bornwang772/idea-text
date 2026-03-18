import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Save } from 'lucide-react';
import { ApiConfig } from '../types';

// Provider presets: baseUrl + default model
const PROVIDER_PRESETS: Record<string, { label: string; baseUrl: string; model: string; description: string }> = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    description: '免费额度，性价比高',
  },
  kimi: {
    label: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    description: '国产大模型，中文能力强',
  },
  qwen: {
    label: '通义千问 (阿里)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-turbo',
    description: '阿里云百炼平台',
  },
  zhipu: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    description: '智谱 AI，GLM-4-Flash 免费',
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: '',
    model: 'gemini-2.0-flash',
    description: '需要科学上网',
  },
  custom: {
    label: '自定义 (OpenAI 兼容)',
    baseUrl: '',
    model: '',
    description: '任何兼容 OpenAI API 格式的服务',
  },
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSave: (config: ApiConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<ApiConfig>(config);

  if (!isOpen) return null;

  const handleProviderChange = (newProvider: string) => {
    const preset = PROVIDER_PRESETS[newProvider];
    if (preset) {
      setLocalConfig({
        ...localConfig,
        provider: newProvider as ApiConfig['provider'],
        baseUrl: preset.baseUrl,
        model: preset.model || localConfig.model,
      });
    }
  };

  const currentPreset = PROVIDER_PRESETS[localConfig.provider];
  const showBaseUrl = localConfig.provider !== 'gemini';

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
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
                >
                  <optgroup label="🇨🇳 国内模型">
                    <option value="deepseek">DeepSeek</option>
                    <option value="kimi">Kimi (月之暗面)</option>
                    <option value="qwen">通义千问 (阿里)</option>
                    <option value="zhipu">智谱 GLM</option>
                  </optgroup>
                  <optgroup label="🌍 海外模型">
                    <option value="gemini">Google Gemini</option>
                  </optgroup>
                  <optgroup label="⚙️ 其他">
                    <option value="custom">自定义 (OpenAI 兼容)</option>
                  </optgroup>
                </select>
                {currentPreset?.description && (
                  <p className="mt-1 text-xs text-gray-400">{currentPreset.description}</p>
                )}
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
                {localConfig.provider === 'deepseek' && (
                  <p className="mt-1 text-xs text-gray-400">
                    获取方式：<a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener" className="text-yellow-600 underline">platform.deepseek.com</a>
                  </p>
                )}
                {localConfig.provider === 'kimi' && (
                  <p className="mt-1 text-xs text-gray-400">
                    获取方式：<a href="https://platform.moonshot.cn/console/api-keys" target="_blank" rel="noopener" className="text-yellow-600 underline">platform.moonshot.cn</a>
                  </p>
                )}
                {localConfig.provider === 'qwen' && (
                  <p className="mt-1 text-xs text-gray-400">
                    获取方式：<a href="https://bailian.console.aliyun.com/" target="_blank" rel="noopener" className="text-yellow-600 underline">阿里云百炼平台</a>
                  </p>
                )}
                {localConfig.provider === 'zhipu' && (
                  <p className="mt-1 text-xs text-gray-400">
                    获取方式：<a href="https://open.bigmodel.cn/usercenter/apikeys" target="_blank" rel="noopener" className="text-yellow-600 underline">open.bigmodel.cn</a>（GLM-4-Flash 免费）
                  </p>
                )}
              </div>

              {showBaseUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                  <input
                    type="text"
                    value={localConfig.baseUrl}
                    onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
                    placeholder={currentPreset?.baseUrl || 'https://api.example.com/v1'}
                  />
                  <p className="mt-1 text-xs text-gray-400">切换提供商时会自动填入，一般无需手动修改</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
                <input
                  type="text"
                  value={localConfig.model}
                  onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
                  placeholder={currentPreset?.model || 'model-name'}
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
