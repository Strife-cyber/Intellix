import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { AppLayoutProps } from '@/types';

import { FloatingNoteFAB } from '@/components/floating-note-fab';
import { BottomNav } from '@/components/bottom-nav';
import { OnboardingTour } from '@/components/onboarding-tour';

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
        {children}
        <FloatingNoteFAB />
        <BottomNav />
        <OnboardingTour />
    </AppLayoutTemplate>
);
