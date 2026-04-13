import {
    type Block,
    type PartialBlock,
    defaultBlockSpecs,
} from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import {
    createReactBlockSpec,
    useCreateBlockNote,
} from '@blocknote/react';
import axios from 'axios';
import React from 'react';
import * as notesRoutes from '@/routes/notes';
import Mermaid from './mermaid-block';

// Custom Mermaid Block Spec
export const MermaidBlockSpec = createReactBlockSpec(
    {
        type: 'mermaid',
        propSchema: {
            chart: {
                default: 'graph TD;\n    A-->B;',
            },
        },
        content: 'none',
    },
    {
        render: (props: { block: { props: { chart: string } } }) => (
            <div className={'mermaid-block'}>
                <Mermaid chart={props.block.props.chart} />
            </div>
        ),
    },
);

// Schema with the custom block
const customSchema = {
    ...defaultBlockSpecs,
    mermaid: MermaidBlockSpec,
};

interface NoteEditorProps {
    initialContent?: PartialBlock[];
    onChange: (blocks: Block[]) => void;
    editable?: boolean;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ initialContent, onChange, editable = true }) => {

    const editor = useCreateBlockNote({
        blockSchema: customSchema,
        initialContent: initialContent,
        uploadFile: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            try {
                const response = await axios.post(notesRoutes.upload().url, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                return response.data.url;
            } catch (error) {
                console.error('File upload failed:', error);
                throw new Error('File upload failed');
            }
        },
    });

    React.useEffect(() => {
        if (editor) {
            const result = editor.onEditorContentChange(() => {
                onChange(editor.topLevelBlocks);
            });
            
            // Only return a cleanup function if onEditorContentChange returned a function
            if (typeof result === 'function') {
                return result;
            }
        }
    }, [editor, onChange]);

    if (!editor) {
        return null;
    }

    return (
        <div className="prose dark:prose-invert max-w-none">
            <BlockNoteView editor={editor} editable={editable} theme="light" />
        </div>
    );
};

export default NoteEditor;
