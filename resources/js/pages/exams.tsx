import AppLayout from '@/layouts/app-layout';
import { exams as examsRoute } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Practice Exams', href: examsRoute().url },
];

export default function exams() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div></div>
        </AppLayout>
    );
}
