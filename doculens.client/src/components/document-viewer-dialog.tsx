import React, { useState, useEffect } from 'react';
import { X, FileText, AlertCircle, Loader2 } from 'lucide-react';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import type { Citation } from '../models';

import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

interface DocumentViewerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    citation: Citation | null;
}

export const DocumentViewerDialog: React.FC<DocumentViewerDialogProps> = ({ 
    isOpen, 
    onClose, 
    citation 
}) => {
    const [error, setError] = useState<string>('');
    const [documentUri, setDocumentUri] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [blobUrl, setBlobUrl] = useState<string>('');

    useEffect(() => {
        if (isOpen && citation?.fullPath) {
            loadDocument();
        }

        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [isOpen, citation]);

    const loadDocument = async () => {
        if (!citation?.fullPath) return;

        try {
            setIsLoading(true);
            setError('');
            
            const filePath = citation.fullPath.replace('file:///', '');
            const response = await fetch(`/api/documents/download?path=${encodeURIComponent(filePath)}`);

            if (!response.ok) {
                throw new Error(`Failed to load file: ${response.status}`);
            }

            console.log(response);

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            console.log(url);
            
            setBlobUrl(url);
            setDocumentUri(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load document');
            console.error('Document load failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !citation) return null;

    const getFileExtension = (filename: string): string => {
        const parts = filename.split('.');
        return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
    };

    const getSupportedFileType = (filename: string): string | null => {
        const ext = getFileExtension(filename);
        const supportedTypes: { [key: string]: string } = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'csv': 'text/csv',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff',
            'html': 'text/html',
            'htm': 'text/html'
        };
        return supportedTypes[ext] || null;
    };

    const fileType = getSupportedFileType(citation.filename);
    const isSupported = fileType !== null;

    // Prepare document for DocViewer
    const docs = isSupported && documentUri ? [{
        uri: documentUri,
        fileType: getFileExtension(citation.filename),
        fileName: citation.filename
    }] : [];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-semibold text-gray-800 truncate">
                                {citation.filename}
                            </h2>
                            {citation.page_number && (
                                <p className="text-sm text-gray-600">
                                    Page {citation.page_number}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
                        title="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Document Viewer */}
                <div className="flex-1 overflow-hidden bg-gray-50">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                                <p className="text-gray-700 font-medium">Loading document...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                                <p className="text-red-700 font-medium mb-2">Error Loading Document</p>
                                <p className="text-gray-600 text-sm">{error}</p>
                            </div>
                        </div>
                    ) : !isSupported ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center max-w-md">
                                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-700 font-medium mb-2">
                                    Unsupported File Type
                                </p>
                                <p className="text-gray-600 text-sm mb-4">
                                    The file type ".{getFileExtension(citation.filename)}" cannot be previewed in the browser.
                                </p>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                                    <p className="text-sm text-gray-700">
                                        <strong>File:</strong> {citation.filename}
                                    </p>
                                    <p className="text-sm text-gray-700 mt-1 break-all">
                                        <strong>Path:</strong> <code className="text-xs bg-white px-1 py-0.5 rounded">{citation.fullPath}</code>
                                    </p>
                                </div>
                                <p className="text-xs text-gray-500 mt-4">
                                    Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, Images (PNG, JPG, GIF), HTML
                                </p>
                            </div>
                        </div>
                    ) : documentUri ? (
                        <div className="h-full w-full">
                            <DocViewer
                                documents={docs}
                                pluginRenderers={DocViewerRenderers}
                                config={{
                                    header: {
                                        disableHeader: true,
                                        disableFileName: true,
                                        retainURLParams: false
                                    },
                                    csvDelimiter: ",",
                                    pdfZoom: {
                                        defaultZoom: 1.0,
                                        zoomJump: 0.2,
                                    },
                                    pdfVerticalScrollByDefault: true
                                }}
                                theme={{
                                    primary: "#3b82f6",
                                    secondary: "#e5e7eb",
                                    tertiary: "#f3f4f6",
                                    textPrimary: "#1f2937",
                                    textSecondary: "#6b7280",
                                    textTertiary: "#9ca3af",
                                    disableThemeScrollbar: false,
                                }}
                                style={{ height: '100%' }}
                            />
                        </div>
                    ) : null}
                </div>

                {/* Footer with citation text */}
                {citation.text && (
                    <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                        <p className="text-xs font-medium text-gray-600 mb-1">Referenced Text:</p>
                        <p className="text-sm text-gray-700 italic">"{citation.text}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};