/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from 'react';
import { History, X, MessageSquare, Trash2, Search, Calendar, Clock } from 'lucide-react';
import type { ChatMessage, ChatSession, ChatSessionDto, ChatSessionFull } from '../models';

interface RawApiResponse<T = any> {
    $id?: string;
    $values?: T[];
    $ref?: string;
    [key: string]: any;
}

export function removeDollarProperties<T>(obj: T): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => removeDollarProperties(item));
    }

    if (typeof obj === 'object') {
        const cleanedObj: any = {};

        const objAsAny = obj as any;
        if (objAsAny.$values && Array.isArray(objAsAny.$values)) {
            return objAsAny.$values.map((item: any) => removeDollarProperties(item));
        }

        for (const key in obj) {
            if (obj.hasOwnProperty(key) && !key.startsWith('$')) {
                const value = (obj as any)[key];

                if (value && typeof value === 'object' && !Array.isArray(value) && value.$values) {
                    cleanedObj[key] = removeDollarProperties(value);
                } else {
                    cleanedObj[key] = removeDollarProperties(value);
                }
            }
        }

        return cleanedObj;
    }

    return obj;
}

export function cleanApiResponse<T>(response: RawApiResponse<T> | T): T[] | any {
    if (!response) return response;

    if (typeof response === 'object' && '$values' in response && Array.isArray(response.$values)) {
        return response.$values.map(item => removeDollarProperties(item));
    }

    if (Array.isArray(response)) {
        return response.map(item => removeDollarProperties(item));
    }

    return removeDollarProperties(response);
}

export function cleanChatSessionResponse(response: any): any {
    if (!response) return response;

    const cleaned: any = {};

    for (const key in response) {
        if (response.hasOwnProperty(key) && !key.startsWith('$')) {
            if (key === 'messages' && response[key]) {
                const messagesObj = response[key];
                if (messagesObj.$values && Array.isArray(messagesObj.$values)) {
                    cleaned[key] = messagesObj.$values.map((message: any) => removeDollarProperties(message));
                } else if (Array.isArray(messagesObj)) {
                    cleaned[key] = messagesObj.map((message: any) => removeDollarProperties(message));
                } else {
                    cleaned[key] = removeDollarProperties(messagesObj);
                }
            } else {
                cleaned[key] = removeDollarProperties(response[key]);
            }
        }
    }

    return cleaned;
}

const api = {
    list: async (): Promise<ChatSessionDto[]> => {
        const response = await fetch('/chat/history');
        if (!response.ok) throw response;

        const rawData: RawApiResponse<ChatSessionDto> = await response.json();

        const cleanedData = cleanApiResponse(rawData);

        return Array.isArray(cleanedData) ? cleanedData : [cleanedData as ChatSessionDto];
    },

    get: async (id: string): Promise<ChatSessionFull> => {
        const response = await fetch(`/chat/history/${id}`);
        if (!response.ok) throw response;

        const rawData: RawApiResponse<ChatSessionFull> = await response.json();

        const cleanedData = cleanChatSessionResponse(rawData);
        return Array.isArray(cleanedData) ? cleanedData[0] : cleanedData as ChatSessionFull;
    },

    delete: async (id: string): Promise<void> => {
        const response = await fetch(`/chat/history/${id}`, { method: 'DELETE' });
        if (!response.ok) throw response;
    },
};

interface ChatHistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentMessages: ChatMessage[];
    onLoadSession: (messages: ChatMessage[], sessionId: string) => void;
    reload?: number;
    activeSessionId?: string | null;
}

export const ChatHistoryDrawer = ({
    isOpen,
    onClose,
    currentMessages,
    onLoadSession,
    reload,
    activeSessionId
}: ChatHistoryDrawerProps) => {
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const drawerRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = useCallback((event: MouseEvent) => {
        if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden';
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, handleClickOutside]);

    useEffect(() => { 
        loadChatHistory(); 
    }, [isOpen, reload]);

    const loadChatHistory = async () => {
        if (!isOpen) return;
        
        setLoading(true);
        try {
            const dto = await api.list();
            setChatSessions(
                dto.map(s => ({
                    id: s.id,
                    title: s.title,
                    messages: [],
                    createdAt: new Date(s.createdAt),
                    updatedAt: new Date(s.updatedAt),
                }))
            );
        } catch (e) {
            console.error('Failed to load chat history:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadSession = async (session: ChatSession) => {
        try {
            const full = await api.get(session.id);
            const messages = full.messages.map(m => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content,
                timestamp: new Date(m.timestamp),
            }));

            onLoadSession(messages, session.id);
            onClose();
        } catch (e) {
            console.error('Failed to load session:', e);
        }
    };

    const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this conversation?')) {
            try {
                await api.delete(sessionId);
                setChatSessions(prev => prev.filter(s => s.id !== sessionId));
            } catch (e) {
                console.error('Failed to delete session:', e);
            }
        }
    };

    const formatDate = (date: Date): string => {
        const now = new Date();
        const diffH = Math.abs(now.getTime() - date.getTime()) / 36e5;
        if (diffH < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diffH < 168) return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const filteredSessions = chatSessions.filter(
        s =>
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            currentMessages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const grouped = filteredSessions.reduce((g, s) => {
        const now = new Date();
        const days = Math.floor((now.getTime() - s.updatedAt.getTime()) / 864e5);
        let key = 'Older';
        if (days === 0) key = 'Today';
        else if (days === 1) key = 'Yesterday';
        else if (days < 7) key = 'This Week';
        else if (days < 30) key = 'This Month';
        (g[key] ??= []).push(s);
        return g;
    }, {} as Record<string, ChatSession[]>);

    return (
        <>
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-gray-500/50 z-40 duration-300"
                    onClick={onClose}
                />
            )}

            <div
                ref={drawerRef}
                className={`fixed inset-y-0 left-0 z-50 w-96 bg-white shadow-lg transform ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                } transition-transform duration-300 ease-in-out flex flex-col border-r border-gray-200`}
            >
                <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <History className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">Chat History</h2>
                            <p className="text-xs text-gray-500">Your conversation timeline</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 transform hover:scale-105"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all duration-200 bg-white shadow-sm"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto bg-gray-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4" />
                            <span className="text-gray-600 text-sm">Loading chat history...</span>
                        </div>
                    ) : Object.keys(grouped).length === 0 ? (
                        <div className="text-center py-16 px-6">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageSquare className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {searchQuery ? 'No matches found' : 'No Chat History'}
                            </h3>
                            <p className="text-gray-600 text-sm max-w-xs mx-auto">
                                {searchQuery 
                                    ? 'Try adjusting your search terms to find what you\'re looking for.' 
                                    : 'Start a conversation to see your chat history here.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-6">
                            {Object.entries(grouped).map(([group, sessions]) => (
                                <div key={group} className="space-y-3">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 px-2">
                                        <Calendar className="h-3 w-3" />
                                        {group}
                                    </h3>
                                    <div className="space-y-2">
                                        {sessions.map(s => {
                                            const isActive = s.id === activeSessionId;
                                            return (
                                                <div
                                                    key={s.id}
                                                    onClick={() => handleLoadSession(s)}
                                                    className={`group relative p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md ${
                                                        isActive
                                                            ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 ring-2 ring-purple-100 shadow-sm'
                                                            : 'bg-white border-gray-200 hover:border-purple-200'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                {isActive && (
                                                                    <div className="flex items-center gap-1.5 absolute top-2 right-2">
                                                                        <div className="flex items-center justify-center">
                                                                            <div className="h-2 w-2 bg-green-500 rounded-full animate-ping" />
                                                                            <div className="h-2 w-2 bg-green-500 rounded-full absolute" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <h4 className="font-medium text-gray-900 text-sm line-clamp-2 leading-relaxed flex-1">
                                                                    {s.title}
                                                                </h4>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                <Clock className="h-3 w-3" />
                                                                <span>{formatDate(s.updatedAt)}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={e => handleDeleteSession(s.id, e)}
                                                            className="opacity-0 group-hover:opacity-100 p-2 cursor-pointer rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 flex-shrink-0 ml-2"
                                                            title="Delete conversation"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-200 p-4 bg-white">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                            {filteredSessions.length} conversation{filteredSessions.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-gray-400">
                            Updated just now
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
};