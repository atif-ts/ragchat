import React, { useState, useEffect } from 'react';
import { Edit3, X, Save, Loader2, Play, Server, Cpu, FileText, Key } from 'lucide-react';
import { type AppSettings } from '../models';

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    configuration: AppSettings | null;
    onSave: (config: AppSettings) => void;
    isLoading: boolean;
    isCreating?: boolean;
}

export const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, configuration, onSave, isLoading, isCreating = false }) => {
    const [editedConfig, setEditedConfig] = useState<AppSettings | null>(null);
    const [isTriggering, setIsTriggering] = useState(false);
    const [triggerMessage, setTriggerMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (configuration) {
            setEditedConfig({ ...configuration });
        } else if (isCreating && isOpen) {
            const defaultConfig: AppSettings = {
                id: 0,
                provider: '',
                configurationName: '',
                documentPath: '',
                endpoint: '',
                model: '',
                embeddingModel: '',
                apiKey: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: false
            };
            setEditedConfig(defaultConfig);
        }
    }, [configuration, isCreating, isOpen]);

    const handleSave = () => {
        if (editedConfig) {
            onSave(editedConfig);
        }
    };

    const updateField = (field: keyof AppSettings, value: string) => {
        if (editedConfig) {
            setEditedConfig({ ...editedConfig, [field]: value });
        }
    };

    const triggerDigestion = async () => {
        if (!editedConfig?.documentPath?.trim()) {
            setTriggerMessage({ type: 'error', message: 'Document path is required' });
            return;
        }

        try {
            setIsTriggering(true);
            setTriggerMessage(null);

            const response = await fetch('/api/configuration/trigger-ingestion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentPath: editedConfig.documentPath })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to trigger ingestion');
            }

            const result = await response.json();
            setTriggerMessage({ type: 'success', message: result.message || 'Ingestion started successfully' });
        } catch (err) {
            setTriggerMessage({
                type: 'error',
                message: err instanceof Error ? err.message : 'Failed to trigger ingestion'
            });
        } finally {
            setIsTriggering(false);
            setTimeout(() => setTriggerMessage(null), 5000);
        }
    };

    if (!isOpen || !editedConfig) return null;

    return (
        <div className="fixed inset-0 bg-gray-500/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-md border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between py-2.5 px-4 border-b bg-gray-50 border-gray-300">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-blue-50 rounded">
                            <Edit3 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-medium text-gray-900">
                                {isCreating ? 'New Configuration' : 'Edit Configuration'}
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Configure your AI service settings
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-50 rounded transition-colors"
                    >
                        <X className="h-4 w-4 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-100">
                    <div className="p-3 ">
                        {triggerMessage && (
                            <div className={`p-3 rounded border text-sm mb-4 ${triggerMessage.type === 'success'
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-red-50 border-red-200 text-red-700'
                                }`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${triggerMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    {triggerMessage.message}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-1.5 bg-blue-50 rounded border border-blue-100">
                                        <Server className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900">Service Configuration</h3>
                                        <p className="text-xs text-gray-500">Core service settings</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-normal text-gray-700 mb-2">
                                            Configuration Name
                                        </label>
                                        <input
                                            type="text"
                                            value={editedConfig.configurationName}
                                            onChange={(e) => updateField('configurationName', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Production Configuration"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-normal text-gray-700 mb-2">
                                                Provider
                                            </label>
                                            <select
                                                value={editedConfig.provider || ''}
                                                onChange={(e) => updateField('provider', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Select provider</option>
                                                <option value="Azure">Azure</option>
                                                <option value="Bedrock">Bedrock</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-normal text-gray-700 mb-2">
                                                API Endpoint
                                            </label>
                                            <input
                                                type="text"
                                                value={editedConfig.endpoint}
                                                onChange={(e) => updateField('endpoint', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="http://localhost:8000"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-normal text-gray-700 mb-2 flex items-center gap-2">
                                            <Key className="h-3 w-3 text-gray-400" />
                                            API Key
                                        </label>
                                        <input
                                            type="password"
                                            value={editedConfig.apiKey}
                                            onChange={(e) => updateField('apiKey', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                            placeholder="Enter your API key"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-1.5 bg-purple-50 rounded border border-purple-100">
                                        <Cpu className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900">AI Models</h3>
                                        <p className="text-xs text-gray-500">Select language and embedding models</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-normal text-gray-700 mb-2">
                                            Language Model
                                        </label>
                                        <select
                                            value={editedConfig.model}
                                            onChange={(e) => updateField('model', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option value="">Select model</option>
                                            <optgroup label="OpenAI">
                                                <option value="gpt-4">GPT-4</option>
                                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                            </optgroup>
                                            <optgroup label="Anthropic">
                                                <option value="claude-3-opus">Claude 3 Opus</option>
                                                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                                                <option value="claude-3-haiku">Claude 3 Haiku</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-normal text-gray-700 mb-2">
                                            Embedding Model
                                        </label>
                                        <select
                                            value={editedConfig.embeddingModel}
                                            onChange={(e) => updateField('embeddingModel', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option value="">Select model</option>
                                            <optgroup label="OpenAI">
                                                <option value="text-embedding-ada-002">text-embedding-ada-002</option>
                                                <option value="text-embedding-3-small">text-embedding-3-small</option>
                                                <option value="text-embedding-3-large">text-embedding-3-large</option>
                                            </optgroup>
                                            <optgroup label="Open Source">
                                                <option value="sentence-transformers">sentence-transformers</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-1.5 bg-green-50 rounded border border-green-100">
                                        <FileText className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900">Document Processing</h3>
                                        <p className="text-xs text-gray-500">Configure document ingestion</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-normal text-gray-700 mb-2">
                                            Document Path
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={editedConfig.documentPath}
                                                onChange={(e) => updateField('documentPath', e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                                placeholder="/path/to/documents"
                                            />
                                            <button
                                                onClick={triggerDigestion}
                                                disabled={isTriggering || !editedConfig.documentPath?.trim()}
                                                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm flex items-center gap-1.5"
                                            >
                                                {isTriggering ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Play className="h-3 w-3" />
                                                )}
                                                {isTriggering ? 'Processing' : 'Ingest'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1.5">
                                            Process and index documents from the specified directory path
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center p-3 border-t border-gray-100 bg-white">
                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading || !editedConfig.configurationName.trim()}
                            className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1.5"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    {isCreating ? 'Creating...' : 'Saving...'}
                                </>
                            ) : (
                                <>
                                    <Save className="h-3 w-3" />
                                    {isCreating ? 'Create' : 'Save'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};