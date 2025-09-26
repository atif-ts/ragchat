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