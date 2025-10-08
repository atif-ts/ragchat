import React, { useState, useEffect, useRef } from 'react';
import { Info, X, Save, Loader2, Upload, Smile, LayoutPanelLeft } from 'lucide-react';
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
    const [emojiInput, setEmojiInput] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            loadApplicationInfo();
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
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
            
            if (data.icon && !data.icon.startsWith('data:image')) {
                setEmojiInput(data.icon);
            } else {
                setEmojiInput('');
            }
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
            setEmojiInput('');
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
        setEmojiInput('');
        updateField('icon', '');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleEmojiInputChange = (newValue: string) => {
        setEmojiInput(newValue);
        setIconPreview(newValue);
        updateField('icon', newValue);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-500/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-md border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between py-2.5 px-4 border-b bg-gray-50 border-gray-300">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-purple-50 rounded">
                            <LayoutPanelLeft className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-medium text-gray-900">
                                Application Information
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Customize your application appearance
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
                    <div className="p-3">
                        {errorMessage && (
                            <div className="p-3 rounded border text-sm mb-4 bg-red-50 border-red-200 text-red-700">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    {errorMessage}
                                </div>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                                <span className="ml-2 text-sm text-gray-600">Loading...</span>
                            </div>
                        ) : appInfo ? (
                            <div className="space-y-2">
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-1.5 bg-blue-50 rounded border border-blue-100">
                                            <Info className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900">Application Details</h3>
                                            <p className="text-xs text-gray-500">Basic information about your app</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-normal text-gray-700 mb-2">
                                                Application Name
                                            </label>
                                            <input
                                                type="text"
                                                value={appInfo.appName}
                                                onChange={(e) => updateField('appName', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="DocuLens"
                                            />
                                            <p className="text-xs text-gray-500 mt-1.5">
                                                This name appears in the header and throughout the application
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-normal text-gray-700 mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                value={appInfo.description}
                                                onChange={(e) => updateField('description', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Chat with your documents"
                                                rows={3}
                                            />
                                            <p className="text-xs text-gray-500 mt-1.5">
                                                A brief description shown in the header
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-1.5 bg-purple-50 rounded border border-purple-100">
                                            <Smile className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900">Application Icon</h3>
                                            <p className="text-xs text-gray-500">Customize your app icon</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {iconPreview && (
                                            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded bg-gray-50">
                                                <div className="w-12 h-12 flex items-center justify-center border border-gray-300 rounded bg-white overflow-hidden">
                                                    {iconPreview.startsWith('data:image') ? (
                                                        <img
                                                            src={iconPreview}
                                                            alt="Icon preview"
                                                            className="w-full h-full object-contain"
                                                        />
                                                    ) : (
                                                        <span className="text-2xl">{iconPreview}</span>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-gray-700">Icon Preview</p>
                                                    <p className="text-xs text-gray-500">Change or remove as needed</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={removeIcon}
                                                    className="px-2.5 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                onClick={handleIconBrowse}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm w-fit"
                                            >
                                                <Upload className="h-3 w-3" />
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
                                                Or enter an emoji (e.g., 🤖, 😃, 💻)
                                            </p>
                                            <input
                                                type="text"
                                                value={emojiInput}
                                                onChange={(e) => handleEmojiInputChange(e.target.value)}
                                                className="w-32 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                                                placeholder="📄"
                                                maxLength={2}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            PNG, JPG, GIF up to 2MB or use an emoji. Appears in header.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : null}
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
                            disabled={isSaving || !appInfo?.appName.trim()}
                            className="px-4 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1.5"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-3 w-3" />
                                    Save
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};