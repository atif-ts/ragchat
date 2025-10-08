/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import type { AppSettings, ApplicationInfo, ChatMessage, ChatResponse } from './models';
import { SettingsDrawer } from './components/drawer-setting';
import { ChatHistoryDrawer, cleanApiResponse } from './components/chat-history';
import { FileText, Menu, Settings, History, Plus, Sparkles } from 'lucide-react';
import { ChatArea } from './components/chat-area';

export default function App() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
    const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
    const [reload, setReload] = useState(0);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const [appInfo, setAppInfo] = useState<ApplicationInfo>({
        id: 1,
        appName: '',
        description: '',
        icon: '',
        createdAt: '',
        updatedAt: ''
    });

    useEffect(() => { loadApplicationInfo(); }, []);

    const loadApplicationInfo = async () => {
        try {
            const res = await fetch(`/api/applicationinfo`);
            if (!res.ok) throw new Error('App info fetch failed');
            const info: ApplicationInfo = await res.json();
            setAppInfo(info);
        } catch (e) {
            console.error(e);
        }
    };

    const [settings, setSettings] = useState<AppSettings>({
        documentPath: '',
        endpoint: '',
        model: '',
        embeddingModel: '',
        apiKey: '',
        configurationName: '',
        createdAt: '',
        id: 0,
        isActive: false,
        updatedAt: ''
    });

    useEffect(() => { loadConfiguration(); }, []);

    const loadConfiguration = async () => {
        try {
            const res = await fetch(`/api/configuration`);
            if (!res.ok) throw new Error('Config fetch failed');
            const cfg: AppSettings = await res.json();
            setSettings(cfg);
        } catch (e) {
            console.error(e);
        }
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputMessage.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const requestBody = {
                question: inputMessage.trim(),
                ...(activeSessionId && { sessionId: activeSessionId })
            };

            const res = await fetch(`/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!res.ok) throw new Error(String(res.status));

            const result: ChatResponse = await res.json();
            const data = cleanApiResponse(result);

            if (!activeSessionId && data.sessionId) {
                setActiveSessionId(data.sessionId);
            }

            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.answer,
                sources: data.sources,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMsg]);

            setReload(prev => prev + 1);
        } catch (e) {
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error while processing your request. Please try again.',
                timestamp: new Date()
            };
            console.error(e);
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleLoadChatSession = (sessionMessages: ChatMessage[], sessionId: string) => {
        setMessages(sessionMessages);
        setActiveSessionId(sessionId);
    };

    const startNewChat = () => {
        setMessages([]);
        setInputMessage('');
        setActiveSessionId(null);
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
            <SettingsDrawer
                isOpen={settingsDrawerOpen}
                onClose={() => setSettingsDrawerOpen(false)}
                onAppInfoUpdate={loadApplicationInfo}
            />

            <ChatHistoryDrawer
                isOpen={historyDrawerOpen}
                onClose={() => setHistoryDrawerOpen(false)}
                currentMessages={messages}
                onLoadSession={handleLoadChatSession}
                reload={reload}
                activeSessionId={activeSessionId}
            />

            <div className="flex-1 flex flex-col shadow-lg rounded-l-2xl bg-white overflow-hidden">
                <div className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-100 px-6 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSettingsDrawerOpen(!settingsDrawerOpen)}
                                className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
                            >
                                <Menu className="h-5 w-5" />
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    {appInfo.icon ? (
                                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50 shadow-sm flex items-center justify-center">
                                            {appInfo.icon.startsWith('data:image') ? (
                                                <img
                                                    src={appInfo.icon}
                                                    alt="App Icon"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                                                        if (fallback) {
                                                            fallback.classList.remove('hidden');
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-xl">{appInfo.icon}</span>
                                            )}
                                            <FileText className="fallback-icon hidden w-full h-full text-blue-600 p-2" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border border-gray-200 flex items-center justify-center shadow-sm">
                                            <Sparkles className="h-5 w-5 text-blue-600" />
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-xl font-bold text-gray-800 truncate">
                                            {appInfo.appName ? `${appInfo.appName}` : 'DocuLens'}
                                        </h1>
                                        {activeSessionId && (
                                            <span className="flex items-center gap-1.5 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                                <div className="flex items-center justify-center">
                                                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-ping" />
                                                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full absolute" />
                                                </div>
                                                Continuing Chat
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 truncate">
                                        {appInfo.description || 'AI-powered document analysis and chat'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {messages.length > 0 && (
                                <button
                                    onClick={startNewChat}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer shadow-sm hover:shadow-md font-medium"
                                    title="Start New Chat"
                                >
                                    <Plus className="h-4 w-4" />
                                    New Chat
                                </button>
                            )}

                            <button
                                onClick={() => { setHistoryDrawerOpen(true); setReload(r => r + 1); }}
                                className="p-2.5 rounded-xl cursor-pointer text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200 border border-transparent hover:border-purple-200"
                                title="Chat History"
                            >
                                <History className="h-5 w-5" />
                            </button>

                            <button
                                onClick={() => setSettingsDrawerOpen(true)}
                                className="p-2.5 rounded-xl cursor-pointer text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 border border-transparent hover:border-gray-200"
                                title="Open Settings"
                            >
                                <Settings className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <ChatArea
                    messages={messages}
                    isLoading={isLoading}
                    inputMessage={inputMessage}
                    setInputMessage={setInputMessage}
                    onSendMessage={sendMessage}
                    onKeyPress={handleKeyPress}
                     appInfo={appInfo} 
                />
            </div>
        </div>
    );
}