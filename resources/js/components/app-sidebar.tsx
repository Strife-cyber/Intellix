import { Link } from '@inertiajs/react';
import {
    UploadCloud,
    FolderOpen,
    LayoutGrid,
    Layers2Icon,
    ListChecks,
    Calendar,
    BookOpen,
} from 'lucide-react';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
    dashboard,
    exams,
    flashcards,
    library,
    upload,
    courses,
    prosits,
} from '@/routes';
import type { NavItem } from '@/types';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
        icon: LayoutGrid,
    },
    {
        title: 'Courses',
        href: courses.index().url,
        icon: BookOpen,
        items: [
            {
                title: 'All Courses',
                href: courses.index().url,
            },
            {
                title: 'Prosits',
                href: prosits.index().url,
            },
            {
                title: 'Exams',
                href: exams.index().url,
            },
        ],
    },
    {
        title: 'Library',
        href: library().url,
        icon: FolderOpen,
    },
    {
        title: 'Flashcards',
        href: flashcards().url,
        icon: Layers2Icon,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Upload',
        href: upload().url,
        icon: UploadCloud,
    },
    {
        title: 'Study Planner',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: Calendar,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard().url} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
