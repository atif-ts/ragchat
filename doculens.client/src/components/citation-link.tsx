import { Download, FileText } from "lucide-react";
import type { Citation } from "../models";

export const CitationLink = ({ citation }: { citation: Citation }) => {
    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();

        try {
            const filePath = citation.fullPath?.replace('file:///', '') || citation.filename;

            const response = await fetch(`/api/documents/download?path=${encodeURIComponent(filePath)}`);

            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.status}`);
            }

            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = citation.filename;

            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Download failed:', error);
            alert(`Failed to download file: ${citation.filename}`);
        }
    };

    const formatFilename = (filename: string) => {
        if (filename.length > 30) {
            return filename.substring(0, 27) + '...';
        }
        return filename;
    };

    const getFileExtension = (filename: string) => {
        return filename.split('.').pop()?.toLowerCase() || '';
    };

    const getFileIcon = (filename: string) => {
        const ext = getFileExtension(filename);
        switch (ext) {
            case 'pdf':
                return <FileText className="h-3 w-3 text-red-500" />;
            case 'doc':
            case 'docx':
                return <FileText className="h-3 w-3 text-blue-500" />;
            case 'txt':
                return <FileText className="h-3 w-3 text-gray-500" />;
            default:
                return <FileText className="h-3 w-3 text-gray-500" />;
        }
    };

    return (
        <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md border border-blue-200 transition-colors group"
            title={`Download: ${citation.filename}${citation.page_number ? ` (Page ${citation.page_number})` : ''}`}
        >
            <div className="flex items-center gap-1">
                {getFileIcon(citation.filename)}
                <span className="font-medium">
                    {formatFilename(citation.filename)}
                </span>
                {citation.page_number && (
                    <span className="text-blue-500">
                        p.{citation.page_number}
                    </span>
                )}
            </div>
            <Download className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
    );
};