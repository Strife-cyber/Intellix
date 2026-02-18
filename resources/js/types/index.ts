export type * from './auth';
export type * from './navigation';
export type * from './ui';

import type { Auth } from './auth';

export type SharedData = {
    name: string;
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
};

export type Resource = {
    id: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
    updated_at: string;
    pivot: {
        role: string;
    };
}
