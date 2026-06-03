import { Link } from '@inertiajs/react';
import {
    UploadCloud,
    FolderOpen,
    LayoutGrid,
    Layers2Icon,
    Calendar,
    BookOpen,
    Notebook,
    SearchCode,
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
    flashcards,
    library,
    upload
} from '@/routes';
import cers from '@/routes/cers';
import courses from '@/routes/courses';
import exams from '@/routes/exams';
import notes from '@/routes/notes';
import prosits from '@/routes/prosits';
import studyPlanner from '@/routes/study-planner';
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
        title: 'Notes',
        href: notes.index().url,
        icon: Notebook,
        items: [
            {
                title: 'My notes',
                href: notes.index().url
            },
            {
                title: 'Create new',
                href: notes.create().url
            }
        ]
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
    {
        title: "Cahier d'étude",
        href: cers.index().url,
        icon: SearchCode,
        items: [
            {
                title: 'Bibliothèque PROSIT',
                href: cers.index().url,
            },
            {
                title: 'Cahiers générés',
                href: cers.all().url,
            },
            {
                title: 'Générer un CER',
                href: '/cers/generate',
            },
            {
                title: 'Travaux en cours',
                href: '/cers/jobs',
            },
        ],
    }
];

const footerNavItems: NavItem[] = [
    {
        title: 'Upload',
        href: upload().url,
        icon: UploadCloud,
    },
    {
        title: 'Study Planner',
        href: studyPlanner.index().url,
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
