import React, { useRef, useState } from 'react';
import { Image, Upload, X, Check } from 'lucide-react';

interface IconSelectorProps {
    currentIcon: string;
    onIconChange: (iconData: string) => void;
    disabled?: boolean;
}

export const IconSelector: React.FC<IconSelectorProps> = ({
    currentIcon,
    onIconChange,
    disabled = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file (PNG, JPG, GIF, etc.)');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert('Please select an image smaller than 2MB');
            return;
        }

        setIsUploading(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target?.result as string;
            onIconChange(base64String);
            setIsUploading(false);
        };
        reader.onerror = () => {
            alert('Error reading file. Please try again.');
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleClick = () => {
        if (disabled) return;
        fileInputRef.current?.click();
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
        e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) {
            setDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        if (disabled) return;

        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find(file => file.type.startsWith('image/'));

        if (imageFile) {
            handleFileSelect(imageFile);
        } else {
            alert('Please drop a valid image file');
        }
    };

    const handleRemoveIcon = () => {
        onIconChange('');
    };

    return (
        <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Image className="h-4 w-4" />
                App Icon
            </label>

            {/* Icon Preview */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                        {currentIcon ? (
                            <img
                                src={currentIcon}
                                alt="App Icon"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    console.error('Icon failed to load');
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : (
                            <Image className="h-8 w-8 text-gray-400" />
                        )}
                    </div>

                    {currentIcon && (
                        <button
                            onClick={handleRemoveIcon}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                            title="Remove icon"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>

                {/* Upload Area */}
                <div className="flex-1">
                    <div
                        className={`
                            relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all
                            ${dragOver
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                            }
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
                            ${isUploading ? 'pointer-events-none' : ''}
                        `}
                        onClick={handleClick}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {isUploading ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm text-gray-600">Uploading...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="h-8 w-8 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium text-blue-600">Click to upload</span> or drag & drop
                                    </p>
                                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileInputChange}
                        className="hidden"
                        disabled={disabled}
                    />
                </div>
            </div>

            <p className="text-xs text-gray-500">
                Upload an icon to personalize your app. Recommended size: 64x64px or larger.
            </p>
        </div>
    );
};