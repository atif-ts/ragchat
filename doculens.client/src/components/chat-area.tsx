import { useEffect, useRef } from "react";
import type { ChatMessage } from "../models";
import { Send, Mic, MicOff, Sparkles, Zap } from "lucide-react";
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

    const suggestedQuestions = [
        "What are the key points in my documents?",
        "Can you summarize the main topics?",
        "Find information about...",
        "Explain the most important concepts"
    ];

    if (!browserSupportsSpeechRecognition) {
        console.warn('Browser does not support speech recognition.');
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-white to-gray-50/50">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                            <Sparkles className="h-8 w-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Welcome to DocuLens AI
                        </h2>
                        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                            Ask questions about your documents and get instant AI-powered answers with proper citations and sources.
                        </p>
                        
                        {/* Suggested Questions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mb-8">
                            {suggestedQuestions.map((question, index) => (
                                <button
                                    key={index}
                                    onClick={() => setInputMessage(question)}
                                    className="p-4 cursor-pointer text-left bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all duration-200 hover:bg-blue-50/50 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Zap className="h-4 w-4 text-blue-500 group-hover:text-blue-600 flex-shrink-0" />
                                        <span className="text-sm text-gray-700 group-hover:text-gray-900">{question}</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {browserSupportsSpeechRecognition && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50/50 px-4 py-2 rounded-full border border-blue-100">
                                <Mic className="h-4 w-4 text-blue-500" />
                                Voice input available - click the microphone icon
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => (
                            <ChatMessageComponent
                                key={msg.id}
                                message={msg}
                                isTyping={msg.role === 'assistant' && index === messages.length - 1}
                            />
                        ))}
                    </>
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-3xl rounded-2xl px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 mr-12 shadow-sm">
                            <div className="flex items-center space-x-3">
                                <div className="flex space-x-1">
                                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                                <span className="text-gray-700 font-medium">Analyzing your documents...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t border-gray-100 p-3 flex-shrink-0 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={inputMessage}
                            onChange={e => setInputMessage(e.target.value)}
                            onKeyDown={onKeyPress}
                            placeholder="Ask a question about your documents..."
                            className="w-full rounded-2xl border border-gray-200 px-5 py-4 pr-16 resize-none focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 overflow-hidden bg-gray-50/50 shadow-sm transition-all duration-200"
                            rows={1}
                            style={{ minHeight: '56px', maxHeight: '120px' }}
                            disabled={isLoading}
                        />
                        <div className="absolute right-2 top-2 flex space-x-1">
                            {browserSupportsSpeechRecognition && (
                                <button
                                    onClick={toggleListening}
                                    disabled={isLoading}
                                    className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                                        listening
                                            ? 'text-white bg-red-500 hover:bg-red-600 shadow-sm'
                                            : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
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
                                className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                                    inputMessage.trim() && !isLoading
                                        ? 'text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-sm hover:shadow-md'
                                        : 'text-gray-300 bg-gray-100'
                                } disabled:opacity-50`}
                                title="Send message"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    <div className="mt-1 text-center">
                        <div className="text-xs text-gray-500 inline-flex items-center gap-4 flex-wrap justify-center">
                            <span>Press Enter to send, Shift+Enter for new line</span>
                            {browserSupportsSpeechRecognition && (
                                <span className="flex items-center gap-1">
                                    <Mic className="h-3 w-3" />
                                    Voice input available
                                </span>
                            )}
                            {listening && (
                                <span className="flex items-center gap-1 text-red-500 font-medium">
                                    <Mic className="h-3 w-3" />
                                    Listening...
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};