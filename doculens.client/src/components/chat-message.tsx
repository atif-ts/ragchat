import { useState } from "react";
import type { ChatMessage, Citation } from "../models";
import { TypingText } from "./typings";
import { CitationLink } from "./citation-link";
import { User, Bot } from "lucide-react";

export const ChatMessageComponent = ({ message, isTyping }: { message: ChatMessage; isTyping?: boolean }) => {
    const [typingComplete, setTypingComplete] = useState(!isTyping);
    const [copiedBlocks, setCopiedBlocks] = useState<Set<number>>(new Set());

    const parseCitations = (content: string) => {
        const citationRegex = /<citation filename='(file:\/\/\/[^']+)'(?:\s+page_number='(\d+)')?>(.*?)<\/citation>/g;
        const citations: Citation[] = [];
        let match;

        while ((match = citationRegex.exec(content)) !== null) {
            const fullPath = match[1];

            const pathPart = fullPath.replace('file:///', '');
            const decodedPath = decodeURIComponent(pathPart);
            const filename = decodedPath.split(/[/\\]/).pop() || decodedPath;

            citations.push({
                filename: filename,
                fullPath: fullPath,
                page_number: match[2] ? parseInt(match[2]) : undefined,
                text: match[3]
            });
        }

        const contentWithoutCitations = content.replace(citationRegex, '');

        return { content: contentWithoutCitations, citations };
    };

    const copyToClipboard = async (text: string, blockIndex: number) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedBlocks(prev => new Set(prev).add(blockIndex));
            setTimeout(() => {
                setCopiedBlocks(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(blockIndex);
                    return newSet;
                });
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const formatContent = (content: string) => {
        let blockIndex = 0;

        return content
            .replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, language, code) => {
                const currentBlockIndex = blockIndex++;
                const trimmedCode = code.trim();
                const langLabel = language || 'text';
                const isCopied = copiedBlocks.has(currentBlockIndex);

                return `<div class="code-block-container my-4">
                    <div class="code-block-header flex items-center justify-between bg-gray-800 text-white px-4 py-2 rounded-t-lg text-sm">
                        <span class="text-gray-300">${langLabel}</span>
                        <button 
                            class="copy-btn flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-gray-700 transition-colors" 
                            data-code="${encodeURIComponent(trimmedCode)}"
                            data-block-index="${currentBlockIndex}"
                        >
                            ${isCopied ?
                        '<span class="w-3 h-3">✓</span> Copied' :
                        '<span class="w-3 h-3">⧉</span> Copy'
                    }
                        </button>
                    </div>
                    <pre class="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto"><code class="language-${langLabel}">${trimmedCode}</code></pre>
                </div>`;
            })
            .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>')
            .replace(/(\{[\s\S]*?\}|\[[\s\S]*?\])/g, (match) => {
                try {
                    const parsed = JSON.parse(match);
                    const formatted = JSON.stringify(parsed, null, 2);
                    const currentBlockIndex = blockIndex++;
                    const isCopied = copiedBlocks.has(currentBlockIndex);

                    return `<div class="json-block-container my-4">
                        <div class="json-block-header flex items-center justify-between bg-blue-800 text-white px-4 py-2 rounded-t-lg text-sm">
                            <span class="text-blue-200">JSON</span>
                            <button 
                                class="copy-btn flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                                data-code="${encodeURIComponent(formatted)}"
                                data-block-index="${currentBlockIndex}"
                            >
                                ${isCopied ?
                            '<span class="w-3 h-3">✓</span> Copied' :
                            '<span class="w-3 h-3">⧉</span> Copy'
                        }
                            </button>
                        </div>
                        <pre class="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto"><code class="language-json">${formatted}</code></pre>
                    </div>`;
                } catch {
                    return match;
                }
            })
            .replace(/(<[\s\S]*?>)/g, (match) => {
                if (match.includes('\n') || match.length > 100) {
                    const currentBlockIndex = blockIndex++;
                    const isCopied = copiedBlocks.has(currentBlockIndex);

                    return `<div class="xml-block-container my-4">
                        <div class="xml-block-header flex items-center justify-between bg-green-800 text-white px-4 py-2 rounded-t-lg text-sm">
                            <span class="text-green-200">XML/HTML</span>
                            <button 
                                class="copy-btn flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                                data-code="${encodeURIComponent(match)}"
                                data-block-index="${currentBlockIndex}"
                            >
                                ${isCopied ?
                            '<span class="w-3 h-3">✓</span> Copied' :
                            '<span class="w-3 h-3">⧉</span> Copy'
                        }
                            </button>
                        </div>
                        <pre class="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto"><code class="language-xml">${match}</code></pre>
                    </div>`;
                }
                return match;
            })
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>')
            .replace(/\n/g, '<br>');
    };

    const { content, citations } = message.role === 'assistant'
        ? parseCitations(message.content)
        : { content: message.content, citations: [] };

    const handleCopyClick = (event: React.MouseEvent) => {
        const button = event.target as HTMLElement;
        const copyBtn = button.closest('.copy-btn');
        if (copyBtn) {
            event.preventDefault();
            const code = decodeURIComponent(copyBtn.getAttribute('data-code') || '');
            const blockIndex = parseInt(copyBtn.getAttribute('data-block-index') || '0');
            copyToClipboard(code, blockIndex);
        }
    };

    const formattedContent = formatContent(content);

    return (
        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-3`}>
            {/* Avatar for assistant messages (left side) */}
            {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                </div>
            )}

            <div className={`max-w-3xl rounded-lg px-4 py-3 ${message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 shadow-sm'
                }`}>
                <div className={message.role === 'assistant' ? 'text-gray-800' : ''}>
                    {isTyping && !typingComplete ? (
                        <TypingText
                            text={content}
                            onComplete={() => setTypingComplete(true)}
                        />
                    ) : (
                        <div
                            dangerouslySetInnerHTML={{ __html: formattedContent }}
                            onClick={handleCopyClick}
                            className="formatted-content"
                        />
                    )}
                </div>

                {message.role === 'assistant' && citations.length > 0 && typingComplete && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-600 mb-2">Sources:</p>
                        <div className="flex flex-wrap gap-2">
                            {citations.map((citation, i) => (
                                <CitationLink key={i} citation={citation} />
                            ))}
                        </div>
                    </div>
                )}

                {message.role === 'assistant' && message.sources && message.sources.length > 0 && citations.length === 0 && typingComplete && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-600 mb-2">Sources:</p>
                        <div className="flex flex-wrap gap-1">
                            {message.sources.map((source, i) => (
                                <CitationLink
                                    key={i}
                                    citation={{ filename: source, text: 'Referenced content' }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-2 text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            {/* Avatar for user messages (right side) */}
            {message.role === 'user' && (
                <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                    </div>
                </div>
            )}
        </div>
    );
};