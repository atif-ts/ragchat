/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import type { AppSettings, ChatMessage, ChatResponse } from './models';
import { SettingsDrawer } from './components/drawer-setting';
import { FileText, Menu, Settings } from 'lucide-react';
import { ChatArea } from './components/chat-area';

export default function App() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [settings, setSettings] = useState<AppSettings>({
        documentPath: '',
        endpoint: '',
        model: '',
        embeddingModel: '',
        apiKey: '',
        icon: '',
        appName: '',
        description: ''
    });
    const [dirty, setDirty] = useState(false);
    const [isConfigSaving, setIsConfigSaving] = useState(false);
    const [configStatus, setConfigStatus] = useState('');
    const [ingestionStatus, setIngestionStatus] = useState('');

    useEffect(() => { loadConfiguration(); }, []);

    const loadConfiguration = async () => {
        try {
            const res = await fetch(`/api/configuration`);
            if (!res.ok) throw new Error('Config fetch failed');
            const cfg: AppSettings = await res.json();
            setSettings(cfg);
            setDirty(false);
        } catch (e) {
            console.error(e);
            setConfigStatus('Could not load configuration');
            setTimeout(() => setConfigStatus(''), 5000);
        }
    };

    const saveConfiguration = async () => {
        setIsConfigSaving(true);
        setConfigStatus('');
        try {
            const res = await fetch(`/api/configuration`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (!res.ok) throw new Error(String(res.status));
            setConfigStatus('Saved successfully');
            setDirty(false);
            setTimeout(() => setConfigStatus(''), 3000);
        } catch (e) {
            setConfigStatus(`Failed to save: ${e}`);
            setTimeout(() => setConfigStatus(''), 5000);
        } finally {
            setIsConfigSaving(false);
        }
    };

    const digestFolder = async () => {
        if (!settings.documentPath.trim()) {
            setIngestionStatus('Please enter a folder path first');
            setTimeout(() => setIngestionStatus(''), 3000);
            return;
        }

        setIngestionStatus('Starting document digestion…');
        try {
            const res = await fetch(`/api/configuration/trigger-ingestion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentPath: settings.documentPath })
            });
            if (res.status === 409) {
                setIngestionStatus('Digestion already in progress');
                return;
            }
            if (!res.ok) throw new Error(String(res.status));
            setIngestionStatus('Document digestion started successfully');
        } catch (e) {
            setIngestionStatus(`Digestion failed: ${e}`);
        } finally {
            setTimeout(() => setIngestionStatus(''), 5000);
        }
    };

    const updateSetting = (key: keyof AppSettings, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setDirty(true);
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
            const res = await fetch(`/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: inputMessage.trim() })
            });

            if (!res.ok) throw new Error(String(res.status));

            const data: ChatResponse = await res.json();
            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.answer,
                sources: data.sources,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMsg]);
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

    return (
        <div className="flex h-screen bg-gray-50">
            <SettingsDrawer
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                settings={settings}
                onUpdateSetting={updateSetting}
                onSaveConfiguration={saveConfiguration}
                onDigestFolder={digestFolder}
                dirty={dirty}
                isConfigSaving={isConfigSaving}
                configStatus={configStatus}
                ingestionStatus={ingestionStatus}
            />

            <div className="flex-1 flex flex-col">
                <div className="bg-white border-b border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                                <Menu className="h-5 w-5" />
                            </button>

                            <div className="flex-shrink-0">
                                {settings.icon ? (
                                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                        <img
                                            src={settings.icon}
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
                                        <FileText className="fallback-icon hidden w-full h-full text-blue-600 p-1" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 flex items-center justify-center">
                                        <FileText className="h-6 w-6 text-blue-600" />
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl font-semibold text-gray-800 truncate">
                                    {settings.appName ? `${settings.appName} Chat` : 'DocuLens Chat'}
                                </h1>
                                <p className="text-sm text-gray-600 truncate">
                                    {settings.description || 'Ask questions about your documents'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="flex-shrink-0 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            title="Open Settings"
                        >
                            <Settings className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <ChatArea
                    messages={messages}
                    isLoading={isLoading}
                    inputMessage={inputMessage}
                    setInputMessage={setInputMessage}
                    onSendMessage={sendMessage}
                    onKeyPress={handleKeyPress}
                />
            </div>
        </div>
    );
}