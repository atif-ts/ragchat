import { useState, useEffect } from 'react';
import { Settings, X, Edit3, Trash2, Plus, Check, Loader2, AlertTriangle } from 'lucide-react';
import { type AppSettings } from '../models';
import { EditModal } from './edit-model'
import { DeleteModal } from './delete-model';

export const SettingsDrawer = ({
    isOpen,
    onClose
}: {
    isOpen: boolean;
    onClose: () => void;
}) => {
    const [configurations, setConfigurations] = useState<AppSettings[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [activeConfigId, setActiveConfigId] = useState<number | null>(null);

    // Modal states
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<AppSettings | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const [isCreatingNew, setIsCreatingNew] = useState(false);

    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadConfigurations();
        }
    }, [isOpen]);

    const showStatus = (type: 'success' | 'error', message: string) => {
        setStatusMessage({ type, message });
        setTimeout(() => setStatusMessage(null), 5000);
    };

    const loadConfigurations = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/configuration/all');
            if (!response.ok) {
                throw new Error('Failed to load configurations');
            }
            const configs = await response.json();
            setConfigurations(configs);

            const activeConfig = configs.find((config: AppSettings) => config.isActive);
            if (activeConfig) {
                setActiveConfigId(activeConfig.id);
            }
        } catch (err) {
            setError('Failed to load configurations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (configId: number) => {
        try {
            setActionLoading(true);
            const response = await fetch(`/api/configuration/${configId}/activate`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to activate configuration');
            }

            setActiveConfigId(configId);
            showStatus('success', 'Configuration activated successfully');
            await loadConfigurations();
        } catch (err) {
            showStatus('error', 'Failed to activate configuration');
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleNewConfiguration = () => {
        setSelectedConfig(null);
        setIsCreatingNew(true);
        setEditModalOpen(true);
    };

    const handleEdit = (config: AppSettings) => {
        setSelectedConfig(config);
        setIsCreatingNew(false);
        setEditModalOpen(true);
    };

    const handleSaveEdit = async (editedConfig: AppSettings) => {
        try {
            setActionLoading(true);

            if (isCreatingNew) {
                const response = await fetch('/api/configuration', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editedConfig)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to create configuration');
                }

                showStatus('success', 'Configuration created successfully');
            } else {
                const response = await fetch(`/api/configuration/${editedConfig.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editedConfig)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to update configuration');
                }

                showStatus('success', 'Configuration updated successfully');
            }

            setEditModalOpen(false);
            setSelectedConfig(null);
            setIsCreatingNew(false);
            await loadConfigurations();
        } catch (err) {
            showStatus('error', err instanceof Error ? err.message : 'Operation failed');
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = (config: AppSettings) => {
        setSelectedConfig(config);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedConfig) return;

        try {
            setActionLoading(true);
            const response = await fetch(`/api/configuration/${selectedConfig.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete configuration');
            }

            setDeleteModalOpen(false);
            setSelectedConfig(null);
            showStatus('success', 'Configuration deleted successfully');
            await loadConfigurations();
        } catch (err) {
            showStatus('error', err instanceof Error ? err.message : 'Failed to delete configuration');
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />
            )}

            {/* Drawer - Now opens from right side with double width (768px) */}
            <div className={`fixed inset-y-0 right-0 z-50 w-[768px] bg-white shadow-lg transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out flex flex-col`}>
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Configuration Manager</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-medium text-gray-900">Configurations</h3>
                            <button onClick={handleNewConfiguration} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                                <Plus className="h-4 w-4" />
                                New Configuration
                            </button>
                        </div>

                        {statusMessage && (
                            <div className={`p-3 rounded-lg border mb-4 ${statusMessage.type === 'success'
                                ? 'bg-green-50 border-green-200 text-green-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                                }`}>
                                <p className="text-sm font-medium">{statusMessage.message}</p>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                <span className="ml-2 text-gray-600">Loading configurations...</span>
                            </div>
                        ) : error ? (
                            <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 font-medium">{error}</p>
                                <button
                                    onClick={loadConfigurations}
                                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : configurations.length === 0 ? (
                            <div className="text-center py-12">
                                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Configurations Found</h3>
                                <p className="text-gray-600 mb-4 text-sm">Create your first configuration to get started.</p>
                                <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                    <Plus className="h-4 w-4" />
                                    Create Configuration
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {configurations.map((config) => (
                                    <div key={config.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <input
                                                    type="radio"
                                                    checked={activeConfigId === config.id}
                                                    onChange={() => handleActivate(config.id)}
                                                    disabled={actionLoading}
                                                    className="h-4 w-4 text-blue-600"
                                                />

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-medium text-gray-900 truncate">
                                                            {config.configurationName}
                                                        </h4>
                                                        {activeConfigId === config.id && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                                                <Check className="h-3 w-3" />
                                                                Active
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-600 space-y-1">
                                                        <p><span className="font-medium">App:</span> {config.appName || 'DocuLens'}</p>
                                                        <p><span className="font-medium">Model:</span> {config.model || 'Not specified'}</p>
                                                        <p className="truncate"><span className="font-medium">Path:</span> {config.documentPath || 'Not specified'}</p>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        Created: {new Date(config.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 ml-2">
                                                <button
                                                    onClick={() => handleEdit(config)}
                                                    disabled={actionLoading}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                                                    title="Edit configuration"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(config)}
                                                    disabled={actionLoading || activeConfigId === config.id}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                                                    title={activeConfigId === config.id ? "Cannot delete active configuration" : "Delete configuration"}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <EditModal
                isOpen={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false);
                    setSelectedConfig(null);
                }}
                configuration={selectedConfig}
                onSave={handleSaveEdit}
                isLoading={actionLoading}
                isCreating={isCreatingNew}
            />

            <DeleteModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setSelectedConfig(null);
                }}
                configuration={selectedConfig}
                onConfirm={handleConfirmDelete}
                isLoading={actionLoading}
            />
        </>
    );
};