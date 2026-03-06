import AppLayout from '@/layouts/app-layout';
import examsRoutes from '@/routes/exams';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Practice Exams', href: examsRoutes.index.url() },
];

export default function exams() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div></div>
        </AppLayout>
    );
}
