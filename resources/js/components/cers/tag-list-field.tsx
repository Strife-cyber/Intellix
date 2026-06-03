import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TagListFieldProps = {
    label: string;
    placeholder: string;
    values: string[];
    onChange: (values: string[]) => void;
};

export function TagListField({
    label,
    placeholder,
    values,
    onChange,
}: TagListFieldProps) {
    const [draft, setDraft] = useState('');

    const add = () => {
        const trimmed = draft.trim();
        if (!trimmed) return;
        onChange([...values, trimmed]);
        setDraft('');
    };

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex gap-2">
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={placeholder}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            add();
                        }
                    }}
                />
                <Button type="button" variant="outline" size="icon" onClick={add}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            {values.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {values.map((item, index) => (
                        <Badge
                            key={`${item}-${index}`}
                            variant="secondary"
                            className="gap-1 pr-1"
                        >
                            {item}
                            <button
                                type="button"
                                className="rounded-full p-0.5 hover:bg-muted"
                                onClick={() =>
                                    onChange(values.filter((_, i) => i !== index))
                                }
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
