import React, { useState, useEffect } from 'react';
import { Edit3, X, Save, Loader2, Play } from 'lucide-react';
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
        if (configuration) {
            setEditedConfig({ ...configuration });
        } else if (isCreating && isOpen) {
            const defaultConfig: AppSettings = {
                id: 0,
                configurationName: '',
                documentPath: '',
                endpoint: 'http://localhost:8000',
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Edit3 className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-800">
                            {isCreating ? 'Create New Configuration' : 'Edit Configuration'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {triggerMessage && (
                        <div className={`p-3 rounded-lg border mb-4 ${triggerMessage.type === 'success'
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-red-50 border-red-200 text-red-800'
                            }`}>
                            <p className="text-sm font-medium">{triggerMessage.message}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Configuration Name *
                            </label>
                            <input
                                type="text"
                                value={editedConfig.configurationName}
                                onChange={(e) => updateField('configurationName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter configuration name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Document Path
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={editedConfig.documentPath}
                                    onChange={(e) => updateField('documentPath', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="/path/to/documents"
                                />
                                <button
                                    onClick={triggerDigestion}
                                    disabled={isTriggering || !editedConfig.documentPath?.trim()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
                                    title="Trigger document ingestion"
                                >
                                    {isTriggering ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Play className="h-4 w-4" />
                                    )}
                                    {isTriggering ? 'Processing...' : 'Ingest'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Click "Ingest" to trigger document processing for this path
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                API Endpoint
                            </label>
                            <input
                                type="text"
                                value={editedConfig.endpoint}
                                onChange={(e) => updateField('endpoint', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="http://localhost:8000"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Language Model
                                </label>
                                <select
                                    value={editedConfig.model}
                                    onChange={(e) => updateField('model', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select a model...</option>
                                    <optgroup label="OpenAI GPT Models">
                                        <option value="gpt-4">GPT-4</option>
                                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                    </optgroup>
                                    <optgroup label="Anthropic Claude Models">
                                        <option value="claude-3-opus">Claude 3 Opus</option>
                                        <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                                        <option value="claude-3-haiku">Claude 3 Haiku</option>
                                    </optgroup>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Embedding Model
                                </label>
                                <select
                                    value={editedConfig.embeddingModel}
                                    onChange={(e) => updateField('embeddingModel', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select an embedding model...</option>
                                    <optgroup label="OpenAI Embeddings">
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                API Key
                            </label>
                            <input
                                type="password"
                                value={editedConfig.apiKey}
                                onChange={(e) => updateField('apiKey', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="sk-..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading || !editedConfig.configurationName.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {isCreating ? 'Creating...' : 'Saving...'}
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                {isCreating ? 'Create Configuration' : 'Save Changes'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};