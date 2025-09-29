import React, { useState, useEffect, useRef } from 'react';
import { Info, X, Save, Loader2, Upload } from 'lucide-react';
import { type ApplicationInfo } from '../models';

interface ApplicationInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const ApplicationInfoModal: React.FC<ApplicationInfoModalProps> = ({ isOpen, onClose, onSave }) => {
    const [appInfo, setAppInfo] = useState<ApplicationInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [iconPreview, setIconPreview] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            loadApplicationInfo();
        }
    }, [isOpen]);

    const loadApplicationInfo = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/applicationinfo');
            if (!response.ok) {
                throw new Error('Failed to load application info');
            }
            const data = await response.json();
            setAppInfo(data);
            setIconPreview(data.icon || '');
        } catch (err) {
            setErrorMessage('Failed to load application info');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!appInfo) return;

        try {
            setIsSaving(true);
            setErrorMessage('');

            const response = await fetch('/api/applicationinfo', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appInfo)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update application info');
            }

            onSave();
            onClose();
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Failed to save application info');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const updateField = (field: keyof ApplicationInfo, value: string) => {
        if (appInfo) {
            setAppInfo({ ...appInfo, [field]: value });
        }
    };

    const handleIconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setErrorMessage('Please select a valid image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setErrorMessage('Image size must be less than 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target?.result as string;
            setIconPreview(base64String);
            updateField('icon', base64String);
            setErrorMessage('');
        };
        reader.onerror = () => {
            setErrorMessage('Failed to read the image file');
        };
        reader.readAsDataURL(file);
    };

    const handleIconBrowse = () => {
        fileInputRef.current?.click();
    };

    const removeIcon = () => {
        setIconPreview('');
        updateField('icon', '');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-purple-600" />
                        <h2 className="text-lg font-semibold text-gray-800">
                            Application Information
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
                    {errorMessage && (
                        <div className="p-3 rounded-lg border mb-4 bg-red-50 border-red-200 text-red-800">
                            <p className="text-sm font-medium">{errorMessage}</p>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                            <span className="ml-2 text-gray-600">Loading...</span>
                        </div>
                    ) : appInfo ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Application Name *
                                </label>
                                <input
                                    type="text"
                                    value={appInfo.appName}
                                    onChange={(e) => updateField('appName', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="DocuLens"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    This name appears in the header and throughout the application.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={appInfo.description}
                                    onChange={(e) => updateField('description', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Chat with your documents"
                                    rows={3}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    A brief description shown in the header.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Application Icon
                                </label>
                                <div className="space-y-3">
                                    {iconPreview && (
                                        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                                            <div className="w-16 h-16 flex items-center justify-center border border-gray-300 rounded-lg bg-white overflow-hidden">
                                                {iconPreview.startsWith('data:image') ? (
                                                    <img
                                                        src={iconPreview}
                                                        alt="Icon preview"
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-3xl">{iconPreview}</span>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-700">Icon Preview</p>
                                                <p className="text-xs text-gray-500">Click "Browse" to change or "Remove" to delete</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeIcon}
                                                className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-2">
                                        <button
                                            type="button"
                                            onClick={handleIconBrowse}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 w-fit"
                                        >
                                            <Upload className="h-4 w-4" />
                                            Browse Icon
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleIconUpload}
                                            className="hidden"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Or enter an emoji directly (e.g., ???, ??, ??)
                                        </p>
                                        <input
                                            type="text"
                                            value={!iconPreview.startsWith('data:image') ? iconPreview : ''}
                                            onChange={(e) => {
                                                setIconPreview(e.target.value);
                                                updateField('icon', e.target.value);
                                            }}
                                            className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="???"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Upload an image (PNG, JPG, GIF, max 2MB) or use an emoji. The icon appears in the header.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !appInfo?.appName.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};