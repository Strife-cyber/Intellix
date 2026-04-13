import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import NoteEditor from './note-editor';
import VersionSidebar from './version-sidebar';
import { type Block } from '@blocknote/core';

// Expanded Note type to match backend structure
interface Note {
    id: number;
    title: string;
    content: any; // Keep as any to parse from JSON string
    user_id: number;
    version: number;
    type: string;
    parent_id: number | null;
    created_at: string;
    updated_at: string;
    versions?: Note[]; // child versions
    parent?: Note; // parent note
}

interface NoteViewProps {
    noteId: number; // The ID of the root note to display
}

const NoteView: React.FC<NoteViewProps> = ({ noteId }) => {
    const [rootNote, setRootNote] = useState<Note | null>(null);
    const [allVersions, setAllVersions] = useState<Note[]>([]);
    const [currentNote, setCurrentNote] = useState<Note | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNoteData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`/api/notes/${noteId}`);
            const fetchedNote: Note = {
                ...response.data,
                content: typeof response.data.content === 'string' ? JSON.parse(response.data.content) : response.data.content,
            };

            const parent = fetchedNote.parent || fetchedNote;
            const versions = [parent, ...(fetchedNote.parent?.versions || fetchedNote.versions || [])];

            setRootNote(parent);
            setAllVersions(versions.sort((a, b) => b.version - a.version));
            setCurrentNote(fetchedNote);
            setError(null);
        } catch (err) {
            setError('Failed to fetch note data.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [noteId]);

    useEffect(() => {
        fetchNoteData();
    }, [fetchNoteData]);

    const handleSelectVersion = (id: number) => {
        const selected = allVersions.find(v => v.id === id);
        if (selected) {
            setCurrentNote({
                ...selected,
                content: typeof selected.content === 'string' ? JSON.parse(selected.content) : selected.content,
            });
        }
    };

    const handleCreateNewVersion = async () => {
        if (!currentNote || !rootNote) return;

        try {
            await axios.post('/api/notes', {
                title: `Version of "${rootNote.title}"`,
                content: JSON.stringify(currentNote.content),
                type: 'retour',
                parent_id: rootNote.id,
            });
            // Re-fetch to show the new version
            await fetchNoteData();
        } catch (err) {
            setError('Failed to create new version.');
            console.error(err);
        }
    };

    const handleNoteChange = (blocks: Block[]) => {
        if (currentNote) {
            setCurrentNote(prev => prev ? { ...prev, content: blocks } : null);
        }
    };

    const handleSave = async () => {
        if (!currentNote) return;
        try {
            await axios.put(`/api/notes/${currentNote.id}`, {
                title: currentNote.title,
                content: JSON.stringify(currentNote.content),
            });
            // Optionally show a success message
        } catch (err) {
            setError('Failed to save note.');
        }
    };

    if (isLoading) return <div className="p-8">Loading...</div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-8">
                {currentNote && (
                    <>
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold">{currentNote.title}</h1>
                                <p className="text-muted-foreground">Version {currentNote.version} ({currentNote.type})</p>
                            </div>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                            >
                                Save Changes
                            </button>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
                            <NoteEditor
                                initialContent={currentNote.content}
                                onChange={handleNoteChange}
                                editable={true}
                            />
                        </div>
                    </>
                )}
            </main>
            {rootNote && (
                 <VersionSidebar
                    versions={allVersions}
                    currentNoteId={currentNote?.id || 0}
                    onSelectVersion={handleSelectVersion}
                    onCreateNewVersion={handleCreateNewVersion}
                />
            )}
        </div>
    );
};

export default NoteView;
