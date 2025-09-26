import { useState, useEffect } from 'react';
import { History, X, MessageSquare, Trash2, Search, Calendar, User, Bot, Clock } from 'lucide-react';
import type { ChatMessage, ChatSession, ChatSessionDto, ChatSessionFull } from '../models';

const api = {
    list: async (): Promise<ChatSessionDto[]> =>
        fetch('/api/chat/history')
            .then(r => (r.ok ? r.json() : Promise.reject(r))),

    get: async (id: string): Promise<ChatSessionFull> =>
        fetch(`/api/chat/history/${id}`)
            .then(r => (r.ok ? r.json() : Promise.reject(r))),

    delete: async (id: string): Promise<void> => {
        const r = await fetch(`/api/chat/history/${id}`, { method: 'DELETE' });
        if (!r.ok) throw r;
    },
};

export const ChatHistoryDrawer = ({
    isOpen,
    onClose,
    currentMessages,
    onLoadSession
}: {
    isOpen: boolean;
    onClose: () => void;
    currentMessages: ChatMessage[];
    onLoadSession: (messages: ChatMessage[]) => void;
}) => {
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSession, setSelectedSession] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) loadChatHistory();
    }, [isOpen]);

    const loadChatHistory = async () => {
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
            onLoadSession(
                full.messages.map(m => ({
                    id: m.id,
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                    timestamp: new Date(m.timestamp),
                }))
            );
            setSelectedSession(session.id);
            onClose();
        } catch (e) {
            console.error('Failed to load session:', e);
        }
    };

    const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.delete(sessionId);
            setChatSessions(prev => prev.filter(s => s.id !== sessionId));
        } catch (e) {
            console.error('Failed to delete session:', e);
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
                <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />
            )}

            <div
                className={`fixed inset-y-0 left-0 z-50 w-96 bg-white shadow-lg transform ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } transition-transform duration-300 ease-in-out flex flex-col border-r border-gray-200`}
            >
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-purple-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Chat History</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                            <span className="ml-2 text-gray-600">Loading chat history...</span>
                        </div>
                    ) : Object.keys(grouped).length === 0 ? (
                        <div className="text-center py-12 px-6">
                            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Chat History</h3>
                            <p className="text-gray-600 text-sm">
                                {searchQuery ? 'No conversations match your search.' : 'Start a conversation to see your chat history here.'}
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-6">
                            {Object.entries(grouped).map(([group, sessions]) => (
                                <div key={group}>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Calendar className="h-3 w-3" />
                                        {group}
                                    </h3>
                                    <div className="space-y-2">
                                        {sessions.map(s => (
                                            <div
                                                key={s.id}
                                                onClick={() => handleLoadSession(s)}
                                                className={`group relative p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 hover:border-purple-200 ${selectedSession === s.id ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">{s.title}</h4>
                                                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                                                            <span className="flex items-center gap-1">
                                                                <MessageSquare className="h-3 w-3" />
                                                                {s.messages.length} messages
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {formatDate(s.updatedAt)}
                                                            </span>
                                                        </div>
                                                        {currentMessages.length > 0 && (
                                                            <div className="flex items-start gap-2">
                                                                {currentMessages[currentMessages.length - 1].role === 'user' ? (
                                                                    <User className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                                                                ) : (
                                                                    <Bot className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                                                )}
                                                                <p className="text-xs text-gray-600 line-clamp-2">
                                                                    {currentMessages[currentMessages.length - 1].content.substring(0, 100)}
                                                                    {currentMessages[currentMessages.length - 1].content.length > 100 && '...'}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={e => handleDeleteSession(s.id, e)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all ml-2 flex-shrink-0"
                                                        title="Delete conversation"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4">
                    <p className="text-xs text-gray-500 text-center">
                        {filteredSessions.length} conversation{filteredSessions.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        </>
    );
};