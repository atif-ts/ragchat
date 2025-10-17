import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

export type FileStatus = 'Waiting' | 'Ingesting' | 'Done' | 'Failed';

export const API_BASE = import.meta.env.PROD
    ? ''
    : 'https://localhost:7200';

export interface FileProgress {
    fileName: string;
    status: FileStatus;
    error?: string;
    elapsedMs?: number;
}

export function useIngestionProgress() {
    const [files, setFiles] = useState<FileProgress[]>([]);

    useEffect(() => {
        const conn = new signalR.HubConnectionBuilder()
            .withUrl(`${API_BASE}/ingestionHub`)
            .withAutomaticReconnect()
            .build();

        conn.on('FileProgress', (dto: FileProgress) => {
            setFiles(prev => {
                const idx = prev.findIndex(f => f.fileName === dto.fileName);
                if (idx === -1) return [...prev, dto];
                const copy = [...prev];
                copy[idx] = dto;
                return copy;
            });

            console.log(dto);
        });

        conn.on('NothingToIngest', () => {
            setFiles([{ fileName: 'No files to ingest', status: 'Done' }]);
        });

        conn.start().catch(console.error);

        return () => { conn.stop(); };
    }, []);

    const reset = () => setFiles([]);
    return { files, reset };
}