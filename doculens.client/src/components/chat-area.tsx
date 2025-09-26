import { useEffect, useRef } from "react";
import type { ChatMessage } from "../models";
import { FileText, Loader2, Send, Mic, MicOff } from "lucide-react";
import { ChatMessageComponent } from "./chat-message";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export const ChatArea = ({
    messages,
    isLoading,
    inputMessage,
    setInputMessage,
    onSendMessage,
    onKeyPress
}: {
    messages: ChatMessage[];
    isLoading: boolean;
    inputMessage: string;
    setInputMessage: (message: string) => void;
    onSendMessage: () => void;
    onKeyPress: (e: React.KeyboardEvent) => void;
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    useEffect(() => {
        if (transcript) {
            setInputMessage(transcript);
        }
    }, [transcript, setInputMessage]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
    }, [inputMessage]);

    const startListening = () => {
        resetTranscript();
        SpeechRecognition.startListening({
            continuous: true,
            language: 'en-US'
        });
    };

    const stopListening = () => {
        SpeechRecognition.stopListening();
    };

    const toggleListening = () => {
        if (listening) {
            stopListening();
        } else {
            startListening();
        }
    };

    if (!browserSupportsSpeechRecognition) {
        console.warn('Browser does not support speech recognition.');
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <FileText className="h-12 w-12 text-gray-400 mb-4" />
                        <h2 className="text-xl font-medium text-gray-700 mb-2">Welcome to DocuLens</h2>
                        <p className="text-gray-500 max-w-md">
                            Start a conversation by asking questions about your documents.
                            I'll search through your content and provide relevant answers with citations.
                        </p>
                        {browserSupportsSpeechRecognition && (
                            <p className="text-gray-400 text-sm mt-2">
                                You can also use voice input by clicking the microphone icon.
                            </p>
                        )}
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <ChatMessageComponent
                            key={msg.id}
                            message={msg}
                            isTyping={msg.role === 'assistant' && index === messages.length - 1}
                        />
                    ))
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-3xl rounded-lg px-4 py-3 bg-white border border-gray-200 mr-12 shadow-sm">
                            <div className="flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                <span className="text-gray-600">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
                <div className="max-w-4xl mx-auto">
                    <div className="flex space-x-3">
                        <div className="flex-1 relative">
                            <textarea
                                ref={textareaRef}
                                value={inputMessage}
                                onChange={e => setInputMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        onSendMessage();
                                    }
                                }}
                                placeholder="Ask a question about your documents..."
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent overflow-hidden"
                                rows={1}
                                style={{ minHeight: '48px', maxHeight: '120px' }}
                                disabled={isLoading}
                            />
                            <div className="absolute right-2 top-3 flex space-x-1">
                                {browserSupportsSpeechRecognition && (
                                    <button
                                        onClick={toggleListening}
                                        disabled={isLoading}
                                        className={`p-2 rounded transition-colors ${listening
                                                ? 'text-red-500 hover:text-red-600 bg-red-50'
                                                : 'text-gray-400 hover:text-blue-600'
                                            } disabled:opacity-50`}
                                        title={listening ? 'Stop listening' : 'Start voice input'}
                                    >
                                        {listening ? (
                                            <MicOff className="h-5 w-5" />
                                        ) : (
                                            <Mic className="h-5 w-5" />
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={onSendMessage}
                                    disabled={!inputMessage.trim() || isLoading}
                                    className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
                                    title="Send message"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 text-center">
                        Press Enter to send, Shift+Enter for new line
                        {browserSupportsSpeechRecognition && (
                            <span> • Click the microphone to use voice input</span>
                        )}
                        {listening && (
                            <div className="mt-1 text-red-500 font-medium">
                                🎤 Listening...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};