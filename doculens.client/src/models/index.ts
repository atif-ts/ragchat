export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
    timestamp: Date;
}

export interface ChatResponse {
    answer: string;
    sources: string[];
    sessionId?: string;
}

export interface AppSettings {
    id: number;
    configurationName: string;
    documentPath: string;
    endpoint: string;
    model: string;
    embeddingModel: string;
    apiKey: string;
    icon: string;
    appName: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Citation {
    filename: string;
    fullPath?: string;
    page_number?: number;
    text: string;
}

export interface ChatSessionDto {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
}

export interface ChatSessionFull {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messages: {
        id: string;
        role: string;
        content: string;
        timestamp: string;
    }[];
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}
