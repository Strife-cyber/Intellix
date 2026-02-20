import AppLayout from '@/layouts/app-layout';
import { flashcards } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Flashcards',
        href: flashcards().url,
    },
];


export default function Flashcards() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div></div>
        </AppLayout>
    )
}
