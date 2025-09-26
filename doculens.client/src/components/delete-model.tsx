import React from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { type AppSettings } from '../models';

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    configuration: AppSettings | null;
    onConfirm: () => void;
    isLoading: boolean;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, configuration, onConfirm, isLoading }) => {
    if (!isOpen || !configuration) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex items-center gap-3 p-6 border-b border-gray-200">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Delete Configuration</h2>
                        <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-gray-700">
                        Are you sure you want to delete the configuration{' '}
                        <span className="font-medium text-gray-900">"{configuration.configurationName}"</span>?
                        This will permanently remove all settings and cannot be reversed.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4" />
                                Delete Configuration
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};