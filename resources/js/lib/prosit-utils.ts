import type { CerSection } from '@/types';
import type { Prosit } from '@/lib/cer-api';

export const PROSIT_SECTION_LABELS: Record<keyof Prosit, string> = {
    keywords: 'Mots clés',
    context: 'Contexte',
    needs: 'Besoins',
    constraints: 'Contraintes',
    problems: 'Problématique',
    generalisation: 'Généralisation',
    pistes: 'Pistes de solutions',
    plan: "Plan d'action",
};

export function prositToCerSections(prosit: Prosit): CerSection[] {
    return [
        {
            title: 'Keywords',
            content: (prosit.keywords ?? []).join('; '),
        },
        { title: 'Context', content: prosit.context ?? '' },
        {
            title: 'Needs',
            content: (prosit.needs ?? []).join(';\n'),
        },
        {
            title: 'Constraints',
            content: (prosit.constraints ?? []).join(';\n'),
        },
        {
            title: 'Problems',
            content: (prosit.problems ?? []).join(';\n'),
        },
        {
            title: 'Generalisation',
            content: prosit.generalisation ?? '',
        },
        {
            title: 'Pistes',
            content: (prosit.pistes ?? []).join(';\n'),
        },
        {
            title: 'Plan',
            content: (prosit.plan ?? []).join('\n'),
        },
    ];
}

export function cerSectionsToProsit(sections: CerSection[]): Prosit {
    const get = (title: string): string | undefined => {
        const found = sections.find(
            (s) => s.title.trim().toLowerCase() === title.toLowerCase(),
        );
        return found?.content;
    };

    const splitSemicolons = (value: string): string[] =>
        value
            .replace(/\u00A0/g, ' ')
            .split(/;\s*/g)
            .map((s) => s.trim().replace(/\s+/g, ' '))
            .filter(Boolean);

    const keywordsRaw = get('Keywords') ?? '';
    const needsRaw = get('Needs') ?? '';
    const planRaw = get('Plan') ?? '';

    const planLines = planRaw
        ? planRaw
              .replace(/\u00A0/g, ' ')
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean)
        : [];

    return {
        keywords: keywordsRaw ? splitSemicolons(keywordsRaw) : [],
        context: get('Context') ?? '',
        needs: needsRaw ? splitSemicolons(needsRaw) : [],
        constraints: get('Constraints')
            ? splitSemicolons(get('Constraints')!)
            : [],
        problems: get('Problems') ? splitSemicolons(get('Problems')!) : [],
        generalisation:
            get('Generalisation') ?? get('Generalisation(s)') ?? '',
        pistes: get('Pistes') ? splitSemicolons(get('Pistes')!) : [],
        plan: planLines,
    };
}

export function formatSemicolonsToNewlines(value: string): string {
    return value.replace(/;\s*/g, '\n');
}
