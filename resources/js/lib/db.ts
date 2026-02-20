import Dexie, { type Table } from 'dexie';

export interface ChatSession {
    id?: number;
    resourceId: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

export interface ChatMessage {
    id?: number;
    sessionId: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    reasoning?: string;
    createdAt: number;
}

export class ChatDatabase extends Dexie {
    sessions!: Table<ChatSession>;
    messages!: Table<ChatMessage>;

    constructor() {
        super('IntellixChatDB');
        this.version(1).stores({
            sessions: '++id, resourceId, updatedAt',
            messages: '++id, sessionId, createdAt'
        });
    }
}

export const db = new ChatDatabase();
