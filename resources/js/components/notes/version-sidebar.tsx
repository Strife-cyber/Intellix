import React from 'react';

// Define a simple type for a note version
interface NoteVersion {
    id: number;
    version: number;
    type: string;
    created_at: string;
}

interface VersionSidebarProps {
    versions: NoteVersion[];
    currentNoteId: number;
    onSelectVersion: (id: number) => void;
    onCreateNewVersion: () => void;
}

const VersionSidebar: React.FC<VersionSidebarProps> = ({ versions, currentNoteId, onSelectVersion, onCreateNewVersion }) => {
    return (
        <aside className="w-64 p-4 border-l border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Versions</h3>
            <button
                onClick={onCreateNewVersion}
                className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Create New Version (Retour)
            </button>
            <ul>
                {versions.map(version => (
                    <li key={version.id} className="mb-2">
                        <button
                            onClick={() => onSelectVersion(version.id)}
                            className={`w-full text-left p-2 rounded ${
                                version.id === currentNoteId
                                    ? 'bg-gray-200 dark:bg-gray-700'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <div className="font-bold">Version {version.version} ({version.type})</div>
                            <div className="text-sm text-gray-500">
                                {new Date(version.created_at).toLocaleString()}
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </aside>
    );
};

export default VersionSidebar;
