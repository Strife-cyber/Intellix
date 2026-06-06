import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    BookOpen,
    Rocket,
    Zap,
    ArrowRight,
    FileText,
    Brain,
    MessageSquare,
    Calendar,
    StickyNote,
    ScrollText,
} from 'lucide-react';
import React, { useState } from 'react';
import AppLogo from '@/components/app-logo';
import DarkVeil from '@/components/dark-veil';
import { Icons } from '@/components/icons';
import SplashCursor from '@/components/splash-cursor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppearance } from '@/hooks/use-appearance';
import { dashboard, login, register } from '@/routes';
import type { SharedData } from '@/types';

type Feature = {
    icon: React.ElementType; // the React icon component
    title: string;
    subtitle?: string;
    description: string;
    listItems?: string[];
};

const features: Feature[] = [
    {
        icon: Rocket,
        title: 'Unified Knowledge',
        subtitle: 'RAG Pipeline V2',
        description:
            'Chat with your entire library. Advanced retrieval-augmented generation for PDFs, EPUBs, and Web research instantly.',
        listItems: ['Vector Database', 'Citation Tracking'],
    },
    {
        icon: BookOpen,
        title: 'Active Recall',
        subtitle: 'FSRS Algorithm',
        description:
            'Forget forgetting. Automatically generate spaced repetition flashcards from your reading material while you work.',
        listItems: ['Auto-Anki Export', 'Adaptive Scheduling'],
    },
    {
        icon: Zap,
        title: 'Deep Work',
        subtitle: 'Dopamine Safeguard',
        description:
            'A UI that respects your dopamine levels. Zero distractions, pure focus, and customizable Zen modes.',
        listItems: ['App Blocking', 'Flow State Analytics'],
    },
];

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { appearance } = useAppearance();
    const { auth } = usePage<SharedData>().props;
    const [email, setEmail] = useState('');

    const handleRegisterRedirect = () => {
        if (!email) return;
        router.get(`/register`, { email });
    };

    return (
        <>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
                    rel="stylesheet"
                />
            </Head>
            <div className="relative min-h-screen w-screen overflow-hidden bg-white p-6 text-gray-800 lg:justify-center lg:p-8 dark:bg-[#0a0a0a] dark:text-[#9CA3AF]">
                <div className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-30 dark:opacity-100">
                    {appearance != 'dark' ? (
                        <SplashCursor
                            SIM_RESOLUTION={128}
                            DYE_RESOLUTION={1440}
                            DENSITY_DISSIPATION={3.5}
                            VELOCITY_DISSIPATION={2}
                            PRESSURE={0.1}
                            CURL={3}
                            SPLAT_RADIUS={0.2}
                            SPLAT_FORCE={6000}
                            COLOR_UPDATE_SPEED={10}
                        />
                    ) : (
                        <DarkVeil
                            hueShift={0}
                            noiseIntensity={0}
                            scanlineIntensity={0}
                            speed={0.5}
                            scanlineFrequency={0}
                            warpAmount={0}
                            resolutionScale={1}
                        />
                    )}
                </div>

                <header className="relative z-10 mb-6 flex w-full items-center justify-between text-sm not-has-[nav]:hidden">
                    <div className="flex items-center">
                        <AppLogo onWelcome={true} />
                    </div>

                    <nav className="flex items-center gap-4 text-gray-700 dark:text-[#9CA3AF]">
                        <Link href="#">Features</Link>
                        <Link href="#">Pricing</Link>
                        <Link href="#">Research</Link>
                    </nav>

                    <nav className="flex items-center gap-4">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="inline-block rounded-sm border border-gray-200 px-5 py-1.5 text-sm leading-normal text-gray-900 hover:border-gray-300 dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="inline-block rounded-sm border border-transparent px-5 py-1.5 text-sm leading-normal text-gray-700 hover:border-gray-200 dark:text-[#EDEDEC] dark:hover:border-[#3E3E3A]"
                                >
                                    Log in
                                </Link>
                                {canRegister && (
                                    <Link
                                        href={register()}
                                        className="inline-block rounded-sm border border-gray-200 px-5 py-1.5 text-sm leading-normal text-gray-900 hover:border-gray-300 dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                                    >
                                        Join Us
                                    </Link>
                                )}
                            </>
                        )}
                    </nav>
                </header>

                <div className="relative z-10 flex w-full items-center justify-center opacity-100 transition-opacity duration-750 lg:grow starting:opacity-0">
                    <main>
                        <div
                            id="hero-section"
                            className="relative flex flex-col items-center gap-6 overflow-hidden pt-8 text-center md:pt-20"
                        >
                            <div className="relative z-10 flex flex-col items-center gap-6">
                                <div className="flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 dark:border-[#2A2A2A] dark:bg-[#121212]">
                                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                                        v1.0
                                    </p>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                                        BETA NOW LIVE
                                    </p>
                                </div>

                                <h1 className="max-w-4xl text-5xl leading-tight font-extrabold text-gray-900 md:text-7xl dark:text-primary">
                                    The End of the <br /> Crisis of Attention
                                </h1>

                                <p className="text-gray-600 dark:text-[#9CA3AF]">
                                    The first AI-native operating system
                                    designed for deep work and <br />
                                    academic rigor. Reclaim your mental
                                    bandwidth.
                                </p>

                                <div className="flex gap-4">
                                    <Link href={register()}>
                                        <Button
                                            size="lg"
                                            className="gap-2 bg-tint text-white hover:text-tint"
                                        >
                                            Join the Beta
                                            <Rocket className="h-4 w-4" />
                                        </Button>
                                    </Link>

                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="gap-2 border-gray-200 text-gray-900 hover:bg-gray-50 dark:text-primary"
                                    >
                                        <BookOpen className="h-4 w-4" />
                                        Read Manifesto
                                    </Button>
                                </div>

                                <div className="relative mx-auto mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-[#2A2A2A] dark:bg-[#121212] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                                    {/* TOP WINDOW BAR */}
                                    <div className="flex h-10 items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 dark:border-[#2A2A2A] dark:bg-[#141414]">
                                        <div className="flex gap-2">
                                            <div className="h-3 w-3 rounded-full border border-red-500/70 bg-red-500/40" />
                                            <div className="h-3 w-3 rounded-full border border-yellow-500/70 bg-yellow-500/40" />
                                            <div className="h-3 w-3 rounded-full border border-green-500/70 bg-green-500/40" />
                                        </div>
                                        <div className="ml-4 rounded-md bg-gray-200 px-3 py-1 text-xs text-gray-500 dark:bg-[#2A2A2A]/40 dark:text-gray-400">
                                            workspace.ai/app
                                        </div>
                                    </div>

                                    <div className="flex h-[calc(100%-40px)]">
                                        {/* LEFT NAV */}
                                        <div className="flex w-56 flex-col border-r border-gray-200 bg-gray-50 p-4 dark:border-[#2A2A2A] dark:bg-[#111111]">
                                            <div className="space-y-3">
                                                <div className="h-8 rounded bg-gray-200 dark:bg-[#2A2A2A]/40" />
                                                <div className="h-4 w-32 rounded bg-gray-200 dark:bg-[#2A2A2A]/40" />
                                                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-[#2A2A2A]/40" />
                                            </div>

                                            <div className="mt-auto">
                                                <div className="flex h-12 items-center justify-center rounded-md border border-gray-300 text-sm text-gray-700 dark:border-white/20 dark:text-white">
                                                    Upgrade Plan
                                                </div>
                                            </div>
                                        </div>

                                        {/* CENTER WORKSPACE */}
                                        <div className="flex flex-1 flex-col bg-white dark:bg-[#0F0F11]">
                                            {/* TABS HEADER */}
                                            <div className="flex h-12 items-center justify-between border-b border-gray-200 px-6 dark:border-[#2A2A2A]">
                                                <div className="flex items-center gap-6 text-sm">
                                                    <div className="border-b-2 border-gray-900 pb-3 font-medium text-gray-900 dark:border-white dark:text-white">
                                                        Files
                                                    </div>
                                                    <div className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                                        Flashcards
                                                    </div>
                                                    <div className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                                        Analytics
                                                    </div>

                                                    {/* hidden roadmap tabs */}
                                                    <div className="ml-4 flex gap-3">
                                                        <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-[#2A2A2A]" />
                                                        <div className="h-4 w-12 animate-pulse rounded bg-gray-200 dark:bg-[#2A2A2A]" />
                                                        <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-[#2A2A2A]" />
                                                    </div>
                                                </div>

                                                {/* STORAGE BAR */}
                                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                    <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-[#1A1A1A]">
                                                        <div className="h-full w-[45%] bg-gray-800 dark:bg-white" />
                                                    </div>
                                                    4.5 GB / 10 GB
                                                </div>
                                            </div>

                                            {/* MAIN CONTENT */}
                                            <div className="grid flex-1 grid-cols-3 gap-6 p-6">
                                                {/* DROPZONE */}
                                                <div className="col-span-2 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 transition hover:bg-gray-100 dark:border-[#333] dark:bg-[#141414] dark:hover:bg-[#181818]">
                                                    <div className="h-10 w-10 rounded-lg border border-gray-300 dark:border-[#333]" />
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        Drop files to upload
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        PDF • DOCX • CSV •
                                                        Images
                                                    </p>
                                                </div>

                                                {/* FLASHCARDS PREVIEW */}
                                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#2A2A2A] dark:bg-[#141414]">
                                                    <div className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                                                        Flashcards generated
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="h-16 rounded-lg bg-gray-200 dark:bg-[#1A1A1A]" />
                                                        <div className="h-16 rounded-lg bg-gray-200 dark:bg-[#1A1A1A]" />
                                                        <div className="h-16 rounded-lg bg-gray-200 dark:bg-[#1A1A1A]" />
                                                    </div>
                                                </div>

                                                {/* FILE TABLE */}
                                                <div className="col-span-3 overflow-hidden rounded-xl border border-gray-200 dark:border-[#2A2A2A]">
                                                    <div className="grid grid-cols-4 bg-gray-100 px-4 py-3 text-xs text-gray-500 dark:bg-[#141414]">
                                                        <div>Name</div>
                                                        <div>Type</div>
                                                        <div>Size</div>
                                                        <div className="text-right">
                                                            Updated
                                                        </div>
                                                    </div>

                                                    {[
                                                        'Research.pdf',
                                                        'notes.docx',
                                                        'Dataset.csv',
                                                    ].map((file, i) => (
                                                        <div
                                                            key={i}
                                                            className="grid grid-cols-4 border-t border-gray-200 px-4 py-3 text-sm transition hover:bg-gray-50 dark:border-[#1E1E1E] dark:hover:bg-[#161616]"
                                                        >
                                                            <div className="text-gray-900 dark:text-gray-200">
                                                                {file}
                                                            </div>
                                                            <div className="text-gray-500">
                                                                Document
                                                            </div>
                                                            <div className="text-gray-500">
                                                                2.4 MB
                                                            </div>
                                                            <div className="text-right text-gray-500">
                                                                2m ago
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* AI SIDEBAR */}
                                        <div className="flex w-80 flex-col border-l border-gray-200 bg-gray-50 dark:border-[#2A2A2A] dark:bg-[#0D0D0E]">
                                            <div className="border-b border-gray-200 p-4 dark:border-[#2A2A2A]">
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    Workspace AI
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Context aware assistant
                                                </div>
                                            </div>

                                            <div className="flex gap-2 border-b border-gray-200 px-4 py-3 dark:border-[#1A1A1A]">
                                                <div className="rounded-md bg-gray-200 px-3 py-1 text-xs text-gray-700 dark:bg-[#1A1A1A] dark:text-gray-300">
                                                    Summarize
                                                </div>
                                                <div className="rounded-md bg-gray-200 px-3 py-1 text-xs text-gray-700 dark:bg-[#1A1A1A] dark:text-gray-300">
                                                    Quiz
                                                </div>
                                                <div className="rounded-md bg-gray-200 px-3 py-1 text-xs text-gray-700 dark:bg-[#1A1A1A] dark:text-gray-300">
                                                    Extract
                                                </div>
                                            </div>

                                            <div className="flex-1 space-y-4 overflow-hidden p-4">
                                                <div className="max-w-[90%] rounded-lg bg-gray-200 p-3 text-sm text-gray-700 dark:bg-[#161616] dark:text-gray-300">
                                                    I found 12 key concepts in
                                                    Research.pdf.
                                                </div>
                                                <div className="ml-auto max-w-[90%] rounded-lg bg-gray-800 p-3 text-sm text-white dark:bg-white dark:text-black">
                                                    Generate flashcards.
                                                </div>
                                                <div className="max-w-[90%] rounded-lg bg-gray-200 p-3 text-sm text-gray-700 dark:bg-[#161616] dark:text-gray-300">
                                                    Creating spaced repetition
                                                    cards…
                                                </div>
                                            </div>

                                            <div className="border-t border-gray-200 p-3 dark:border-[#2A2A2A]">
                                                <div className="h-10 rounded-lg bg-gray-200 dark:bg-[#161616]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            id="trustees"
                            className="mx-auto my-32 flex w-screen flex-col items-center justify-center space-y-8 bg-gray-100/50 py-6 backdrop-blur-lg dark:bg-white/5"
                            style={{ height: '140px' }}
                        >
                            <p className="text-xs font-semibold tracking-wider text-gray-500 md:text-sm dark:text-gray-200">
                                TRUSTED BY RESEARCHERS AT TOP INSTITUTES
                            </p>

                            <div className="flex flex-wrap justify-center gap-6 text-xs font-medium text-gray-600 md:text-sm dark:text-gray-300">
                                <span>Newbridge University</span>
                                <span>Stanton Research Labs</span>
                                <span>Westbrook Academic Consortium</span>
                                <span>Oakridge College of Science</span>
                            </div>
                        </div>

                        <div
                            id="about-intellix"
                            className="mx-auto max-w-6xl px-8 py-24"
                        >
                            {/* Headline + short value prop */}
                            <div className="mx-auto mb-16 max-w-3xl text-center">
                                <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
                                    One OS for your
                                    <span className="text-purple-600">
                                        {' '}
                                        learning
                                    </span>
                                </h2>
                                <p className="text-lg text-gray-500 dark:text-gray-400">
                                    Documents. Flashcards. Notes. AI Chat. All
                                    in one place, designed for deep work.
                                </p>
                            </div>

                            {/* Stats row — quick visual trust signals */}
                            <div className="mx-auto mb-16 grid max-w-3xl grid-cols-3 gap-8">
                                {[
                                    {
                                        value: '10+',
                                        label: 'Formats supported',
                                    },
                                    {
                                        value: 'FSRS',
                                        label: 'Smart recall algo',
                                    },
                                    {
                                        value: 'PBA',
                                        label: 'Structured learning',
                                    },
                                ].map((stat, i) => (
                                    <div key={i} className="text-center">
                                        <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                                            {stat.value}
                                        </div>
                                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            {stat.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Feature mini-cards — just icon + title + one-liner */}
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                                {[
                                    {
                                        icon: FileText,
                                        title: 'Document AI',
                                        desc: 'Upload any file — PDF, DOCX, EPUB. Instant analysis.',
                                    },
                                    {
                                        icon: Brain,
                                        title: 'Smart Flashcards',
                                        desc: 'FSRS spaced repetition. Auto-generated from docs.',
                                    },
                                    {
                                        icon: MessageSquare,
                                        title: 'AI Chat',
                                        desc: 'Chat with your entire knowledge base.',
                                    },
                                    {
                                        icon: Calendar,
                                        title: 'Study Planner',
                                        desc: 'Plan reviews. Track streaks. Stay consistent.',
                                    },
                                    {
                                        icon: StickyNote,
                                        title: 'Versioned Notes',
                                        desc: 'Notes that evolve. Linked to source materials.',
                                    },
                                    {
                                        icon: ScrollText,
                                        title: 'CER Reports',
                                        desc: 'AI-generated academic reports from your work.',
                                    },
                                ].map((feature, i) => (
                                    <div
                                        key={i}
                                        className="group rounded-lg border border-gray-200 bg-white p-5 transition hover:shadow-md dark:border-[#2A2A2A] dark:bg-[#121212]"
                                    >
                                        <div className="mb-3">
                                            <feature.icon className="h-6 w-6 text-purple-600" />
                                        </div>
                                        <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {feature.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div
                            id="features"
                            className="flex flex-col items-start space-y-12 p-8"
                        >
                            <h2 className="text-6xl font-bold text-gray-900 dark:text-white">
                                The Academic Trinity
                            </h2>

                            <p className="text-xl text-gray-600 dark:text-[#9CA3AF]">
                                Unlock your true potential with tools designed
                                specifically for the modern <br /> researcher's
                                workflow.
                            </p>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                {features.map((feature, i) => (
                                    <div
                                        key={i}
                                        className="relative flex h-[310px] w-full flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-white p-6 dark:border-[#2A2A2A] dark:bg-[#121212]"
                                    >
                                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-[#6F06F933] bg-[#6F06F91A]">
                                            <feature.icon className="h-5 w-5 text-[#6F06F9]" />
                                        </div>

                                        <div className="mb-3 flex flex-col">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                {feature.title}
                                            </h3>
                                            {feature.subtitle && (
                                                <span className="mt-1 font-mono text-sm text-purple-600 dark:text-purple-500">
                                                    {feature.subtitle}
                                                </span>
                                            )}
                                        </div>

                                        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                                            {feature.description}
                                        </p>

                                        {feature.listItems && (
                                            <div className="flex flex-col gap-1">
                                                {feature.listItems.map(
                                                    (item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-500"
                                                        >
                                                            <div className="h-2 w-2 rounded-full bg-green-500" />
                                                            <span>{item}</span>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}

                                        <div className="absolute top-4 right-4 opacity-10">
                                            <feature.icon className="h-20 w-20 text-gray-400 dark:text-gray-500" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div
                            id="global-network"
                            className="relative mt-12 h-[500px] w-full overflow-hidden rounded-lg"
                        >
                            <img
                                src="/network.svg"
                                alt="Background"
                                className="absolute inset-0 h-full w-full object-cover"
                            />

                            <div className="absolute inset-0 z-[1] bg-gradient-to-t from-white via-white/50 to-transparent dark:from-[#121212] dark:via-[#121212]/0 dark:to-transparent" />

                            <div className="absolute bottom-4 left-4 z-10 m-12 flex flex-col gap-1 space-y-4">
                                <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
                                    Join the global intelligence network.
                                </h2>
                                <span className="text-md text-gray-700 dark:text-white">
                                    Connect your research with thousands of
                                    peers. Share knowledge graphs <br />{' '}
                                    securely and accelerate discovery.
                                </span>
                                <Link href={register()}>
                                    <Button
                                        size="lg"
                                        variant="ghost"
                                        className="gap-2 font-mono text-tint hover:bg-gray-100 dark:hover:bg-white/10"
                                    >
                                        EXPLORE THE NETWORK
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div
                            id="cta"
                            className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center dark:bg-[#0a0a0a]"
                        >
                            <h1 className="text-4xl font-extrabold text-gray-900 md:text-5xl dark:text-white">
                                Your second brain is waiting
                            </h1>
                            <p className="max-w-xl text-sm text-gray-600 md:text-base dark:text-gray-400">
                                Don't let your research get lost in the noise.
                                Join us today.
                            </p>

                            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row">
                                <Input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="w-full bg-white sm:w-80 dark:bg-transparent"
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <Button
                                    onClick={handleRegisterRedirect}
                                    className="w-full bg-tint px-4 py-2 text-white hover:text-tint sm:w-auto sm:px-6"
                                >
                                    Get Early Access
                                </Button>
                            </div>

                            <p className="mt-2 text-xs text-gray-500 md:text-sm">
                                Limited spots available for the Fall 2026
                                cohort.
                            </p>
                        </div>
                    </main>
                </div>

                <footer className="relative z-10 border-t border-gray-200 backdrop-blur-md dark:border-[#2A2A2A] dark:bg-[rgba(10,10,10,0.8)]">
                    <div className="mx-auto flex flex-col gap-12 px-6 py-12">
                        <div className="flex flex-col justify-center gap-8 md:flex-row">
                            <div className="flex w-140 flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <AppLogo onWelcome={true} />
                                </div>

                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Operating system for the modern mind
                                </p>

                                <div className="mt-2 flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        className="h-8 w-8 rounded-full p-0 text-gray-600 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
                                    >
                                        <a
                                            href="https://twitter.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Icons.twitter className="h-5 w-5" />
                                        </a>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        className="h-8 w-8 rounded-full p-0 text-gray-600 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
                                    >
                                        <a
                                            href="https://github.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Icons.github className="h-5 w-5" />
                                        </a>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        className="h-8 w-8 rounded-full p-0 text-gray-600 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
                                    >
                                        <a
                                            href="https://linkedin.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Icons.linkedin className="h-5 w-5" />
                                        </a>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        className="h-8 w-8 rounded-full p-0 text-gray-600 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
                                    >
                                        <a
                                            href="https://facebook.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Icons.facebook className="h-5 w-5" />
                                        </a>
                                    </Button>
                                </div>
                            </div>

                            <div className="flex w-72 flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-primary">
                                        Product
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2 text-sm text-gray-400">
                                    <span>Download</span>
                                    <span>Manifesto</span>
                                    <span>Changelog</span>
                                    <span>Pricing</span>
                                </div>
                            </div>

                            <div className="flex w-72 flex-col gap-4">
                                <span className="text-lg font-bold text-primary">
                                    Resources
                                </span>
                                <div className="flex flex-col gap-2 text-sm text-gray-400">
                                    <span>Documentation</span>
                                    <span>API Reference</span>
                                    <span>Community</span>
                                </div>
                            </div>

                            <div className="flex w-72 flex-col gap-4">
                                <span className="text-lg font-bold text-primary">
                                    Legal
                                </span>
                                <div className="flex flex-col gap-2 text-sm text-gray-400">
                                    <span>Privacy Policy</span>
                                    <span>Terms of Service</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#2A2A2A] pt-8 md:flex-row">
                            <span className="text-sm text-gray-500">
                                &copy; 2026 Intellix. All rights reserved.
                            </span>

                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="font-mono text-sm text-gray-400">
                                    Made with care for modern minds
                                </span>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
