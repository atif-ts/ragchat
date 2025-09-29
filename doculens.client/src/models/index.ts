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
    documentPath: string;
    endpoint: string;
    model: string;
    embeddingModel: string;
    apiKey: string;
    configurationName: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
}

export interface ApplicationInfo {
    id: number;
    appName: string;
    description: string;
    icon: string;
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
