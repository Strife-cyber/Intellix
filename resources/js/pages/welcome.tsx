import { Head, Link, usePage } from '@inertiajs/react';
import { BookOpen, Rocket, Zap, ArrowRight } from 'lucide-react';
import React from 'react';
import AppLogo from '@/components/app-logo';
import DarkVeil from '@/components/dark-veil';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
                    rel="stylesheet"
                />
            </Head>
            <div className="relative min-h-screen w-screen overflow-hidden bg-[#FDFDFC] p-6 text-[#9CA3AF] lg:justify-center lg:p-8 dark:bg-[#0a0a0a]">
                <div className="pointer-events-none absolute inset-0 z-0 h-full w-full">
                    <DarkVeil
                        hueShift={0}
                        noiseIntensity={0}
                        scanlineIntensity={0}
                        speed={0.5}
                        scanlineFrequency={0}
                        warpAmount={0}
                        resolutionScale={1}
                    />
                </div>

                <header className="relative z-10 mb-6 flex w-full items-center justify-between text-sm not-has-[nav]:hidden">
                    <div className="flex items-center">
                        <AppLogo onWelcome={true} />
                    </div>

                    <nav className="flex items-center gap-4">
                        <Link>Features</Link>
                        <Link>Pricing</Link>
                        <Link>Research</Link>
                    </nav>

                    <nav className="flex items-center gap-4">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="inline-block rounded-sm border border-transparent px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#19140035] dark:text-[#EDEDEC] dark:hover:border-[#3E3E3A]"
                                >
                                    Log in
                                </Link>
                                {canRegister && (
                                    <Link
                                        href={register()}
                                        className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
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
                                <div className="flex items-center justify-center gap-2 rounded-full border border-[#2A2A2A] bg-[#121212] px-4 py-2">
                                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                    <p className="text-xs font-bold">v1.0</p>
                                    <p className="text-xs font-bold">
                                        BETA NOW LIVE
                                    </p>
                                </div>

                                <h1 className="max-w-4xl text-5xl leading-tight font-extrabold text-primary md:text-7xl">
                                    The End of the <br /> Crisis of Attention
                                </h1>

                                <p>
                                    The first AI-native operating system
                                    designed for deep work and <br />
                                    academic rigor. Reclaim your mental
                                    bandwidth.
                                </p>

                                <div className="flex gap-4">
                                    <Link href={register()}>
                                        <Button
                                            size="lg"
                                            className="gap-2 bg-tint text-primary hover:text-tint"
                                        >
                                            Join the Beta
                                            <Rocket className="h-4 w-4" />
                                        </Button>
                                    </Link>

                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="gap-2 text-primary"
                                    >
                                        <BookOpen className="h-4 w-4" />
                                        Read Manifesto
                                    </Button>
                                </div>

                                <div className="relative mx-auto mt-8 overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#121212] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                                    {/* TOP WINDOW BAR */}
                                    <div className="flex h-10 items-center gap-3 border-b border-[#2A2A2A] bg-[#141414] px-4">
                                        <div className="flex gap-2">
                                            <div className="h-3 w-3 rounded-full border border-red-500/70 bg-red-500/40" />
                                            <div className="h-3 w-3 rounded-full border border-yellow-500/70 bg-yellow-500/40" />
                                            <div className="h-3 w-3 rounded-full border border-green-500/70 bg-green-500/40" />
                                        </div>
                                        <div className="ml-4 rounded-md bg-[#2A2A2A]/40 px-3 py-1 text-xs text-gray-400">
                                            workspace.ai/app
                                        </div>
                                    </div>

                                    <div className="flex h-[calc(100%-40px)]">
                                        {/* LEFT NAV */}
                                        <div className="flex w-56 flex-col border-r border-[#2A2A2A] bg-[#111111] p-4">
                                            <div className="space-y-3">
                                                <div className="h-8 rounded bg-[#2A2A2A]/40" />
                                                <div className="h-4 w-32 rounded bg-[#2A2A2A]/40" />
                                                <div className="h-4 w-24 rounded bg-[#2A2A2A]/40" />
                                            </div>

                                            <div className="mt-auto">
                                                <div className="flex h-12 items-center justify-center rounded-md border border-white/20 text-sm text-white">
                                                    Upgrade Plan
                                                </div>
                                            </div>
                                        </div>

                                        {/* CENTER WORKSPACE */}
                                        <div className="flex flex-1 flex-col bg-[#0F0F11]">
                                            {/* TABS HEADER */}
                                            <div className="flex h-12 items-center justify-between border-b border-[#2A2A2A] px-6">
                                                <div className="flex items-center gap-6 text-sm">
                                                    <div className="border-b-2 border-white pb-3 font-medium text-white">
                                                        Files
                                                    </div>
                                                    <div className="cursor-pointer text-gray-500 hover:text-gray-300">
                                                        Flashcards
                                                    </div>
                                                    <div className="cursor-pointer text-gray-500 hover:text-gray-300">
                                                        Analytics
                                                    </div>

                                                    {/* hidden roadmap tabs */}
                                                    <div className="ml-4 flex gap-3">
                                                        <div className="h-4 w-16 animate-pulse rounded bg-[#2A2A2A]" />
                                                        <div className="h-4 w-12 animate-pulse rounded bg-[#2A2A2A]" />
                                                        <div className="h-4 w-20 animate-pulse rounded bg-[#2A2A2A]" />
                                                    </div>
                                                </div>

                                                {/* STORAGE BAR */}
                                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                                    <div className="h-2 w-32 overflow-hidden rounded-full bg-[#1A1A1A]">
                                                        <div className="h-full w-[45%] bg-white" />
                                                    </div>
                                                    4.5 GB / 10 GB
                                                </div>
                                            </div>

                                            {/* MAIN CONTENT */}
                                            <div className="grid flex-1 grid-cols-3 gap-6 p-6">
                                                {/* DROPZONE */}
                                                <div className="col-span-2 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#333] bg-[#141414] transition hover:bg-[#181818]">
                                                    <div className="h-10 w-10 rounded-lg border border-[#333]" />
                                                    <p className="text-sm font-medium text-white">
                                                        Drop files to upload
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        PDF • DOCX • CSV •
                                                        Images
                                                    </p>
                                                </div>

                                                {/* FLASHCARDS PREVIEW */}
                                                <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4">
                                                    <div className="mb-3 text-sm font-medium text-white">
                                                        Flashcards generated
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="h-16 rounded-lg bg-[#1A1A1A]" />
                                                        <div className="h-16 rounded-lg bg-[#1A1A1A]" />
                                                        <div className="h-16 rounded-lg bg-[#1A1A1A]" />
                                                    </div>
                                                </div>

                                                {/* FILE TABLE */}
                                                <div className="col-span-3 overflow-hidden rounded-xl border border-[#2A2A2A]">
                                                    <div className="grid grid-cols-4 bg-[#141414] px-4 py-3 text-xs text-gray-500">
                                                        <div>Name</div>
                                                        <div>Type</div>
                                                        <div>Size</div>
                                                        <div className="text-right">
                                                            Updated
                                                        </div>
                                                    </div>

                                                    {[
                                                        'Research.pdf',
                                                        'Notes.docx',
                                                        'Dataset.csv',
                                                    ].map((file, i) => (
                                                        <div
                                                            key={i}
                                                            className="grid grid-cols-4 border-t border-[#1E1E1E] px-4 py-3 text-sm transition hover:bg-[#161616]"
                                                        >
                                                            <div className="text-gray-200">
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
                                        <div className="flex w-80 flex-col border-l border-[#2A2A2A] bg-[#0D0D0E]">
                                            <div className="border-b border-[#2A2A2A] p-4">
                                                <div className="font-medium text-white">
                                                    Workspace AI
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Context aware assistant
                                                </div>
                                            </div>

                                            <div className="flex gap-2 border-b border-[#1A1A1A] px-4 py-3">
                                                <div className="rounded-md bg-[#1A1A1A] px-3 py-1 text-xs text-gray-300">
                                                    Summarize
                                                </div>
                                                <div className="rounded-md bg-[#1A1A1A] px-3 py-1 text-xs text-gray-300">
                                                    Quiz
                                                </div>
                                                <div className="rounded-md bg-[#1A1A1A] px-3 py-1 text-xs text-gray-300">
                                                    Extract
                                                </div>
                                            </div>

                                            <div className="flex-1 space-y-4 overflow-hidden p-4">
                                                <div className="max-w-[90%] rounded-lg bg-[#161616] p-3 text-sm text-gray-300">
                                                    I found 12 key concepts in
                                                    Research.pdf.
                                                </div>
                                                <div className="ml-auto max-w-[90%] rounded-lg bg-white p-3 text-sm text-black">
                                                    Generate flashcards.
                                                </div>
                                                <div className="max-w-[90%] rounded-lg bg-[#161616] p-3 text-sm text-gray-300">
                                                    Creating spaced repetition
                                                    cards…
                                                </div>
                                            </div>

                                            <div className="border-t border-[#2A2A2A] p-3">
                                                <div className="h-10 rounded-lg bg-[#161616]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            id="trustees"
                            className="mx-auto my-32 flex w-screen flex-col items-center justify-center space-y-8 bg-white/8 py-6 backdrop-blur-lg"
                            style={{ height: '140px' }}
                        >
                            <p className="text-xs font-semibold tracking-wider text-gray-200 md:text-sm">
                                TRUSTED BY RESEARCHERS AT TOP INSTITUTES
                            </p>

                            <div className="flex flex-wrap justify-center gap-6 text-xs font-medium text-gray-300 md:text-sm">
                                <span>Newbridge University</span>
                                <span>Stanton Research Labs</span>
                                <span>Westbrook Academic Consortium</span>
                                <span>Oakridge College of Science</span>
                            </div>
                        </div>

                        <div
                            id="features"
                            className="flex flex-col items-start space-y-12 p-8"
                        >
                            <h2 className="text-6xl font-bold text-white">
                                The Academic Trinity
                            </h2>

                            <p className="text-xl">
                                Unlock your true potential with tools designed
                                specifically for the modern <br /> researcher's
                                workflow.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {features.map((feature, i) => (
                                    <div
                                        key={i}
                                        className="relative flex h-[310px] w-full flex-col justify-between rounded-lg border border-[#2A2A2A] bg-[#121212] p-6 overflow-hidden"
                                    >
                                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#6F06F91A] border border-[#6F06F933]">
                                            <feature.icon className="h-5 w-5 text-[#6F06F9]" />
                                        </div>

                                        <div className="mb-3 flex flex-col">
                                            <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                                            {feature.subtitle && (
                                                <span className="mt-1 font-mono text-sm text-purple-500">
                                                    {feature.subtitle}
                                                </span>
                                            )}
                                        </div>

                                        <p className="mb-3 text-sm text-gray-400">{feature.description}</p>

                                        {feature.listItems && (
                                            <div className="flex flex-col gap-1">
                                                {feature.listItems.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center gap-2 text-xs text-gray-500"
                                                    >
                                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                                        <span>{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="absolute top-4 right-4 opacity-10">
                                            <feature.icon className="h-20 w-20 text-gray-500" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div
                            id="global-network"
                            className="mt-12 relative h-[500px] w-full rounded-lg overflow-hidden"
                        >
                            <img
                                src="/network.svg"
                                alt="Background"
                                className="absolute inset-0 h-full w-full object-cover"
                            />

                            <div
                                className="absolute inset-0"
                                style={{
                                    background:
                                        'linear-gradient(0deg, #121212 0%, rgba(18, 18, 18, 0) 50%, rgba(18, 18, 18, 0) 100%)',
                                    zIndex: 1,
                                }}
                            />

                            <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1 m-12 space-y-4">
                                <h2 className="text-white font-bold text-4xl">Join the global intelligence network.</h2>
                                <span className="text-white text-md">Connect your research with thousands of peers. Share knowledge graphs <br/> securely and accelerate discovery.</span>
                                <Link href={register()}>
                                    <Button
                                        size="lg"
                                        variant="ghost"
                                        className="gap-2 font-mono text-tint"
                                    >
                                        EXPLORE THE NETWORK
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div
                            id="cta"
                            className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-6 bg-[#0a0a0a]"
                        >
                            <h1 className="text-4xl md:text-5xl font-extrabold text-white">
                                Your second brain is waiting
                            </h1>
                            <p className="text-gray-400 max-w-xl text-sm md:text-base">
                                Don't let your research get lost in the noise. Join us today.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
                                <Input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="sm:w-80 w-full"
                                />
                                <Button className="sm:px-6 px-4 py-2 w-full sm:w-auto bg-tint text-white hover:text-tint">
                                    Get Early Access
                                </Button>
                            </div>

                            <p className="mt-2 text-gray-500 text-xs md:text-sm">
                                Limited spots available for the Fall 2026 cohort.
                            </p>
                        </div>
                    </main>
                </div>

                <footer className="relative z-10 w-full bg-[rgba(10,10,10,0.8)] backdrop-blur-md border-t border-[#2A2A2A]">
                    <div className="mx-auto flex flex-col px-6 py-12 gap-12">

                        <div className="flex flex-col md:flex-row justify-center gap-8">
                            <div className="flex flex-col gap-4 w-140">
                                <div className="flex items-center gap-2">
                                    <AppLogo onWelcome={true} />
                                </div>

                                <p className="text-sm text-gray-400">
                                    Operating system for the modern mind
                                </p>

                                <div className="flex items-center gap-3 mt-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        className="p-0 w-8 h-8 rounded-full"
                                    >
                                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                                            <Icons.twitter className="w-5 h-5 text-white" />
                                        </a>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        className="p-0 w-8 h-8 rounded-full"
                                    >
                                        <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                                            <Icons.github className="w-5 h-5 text-white" />
                                        </a>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        className="p-0 w-8 h-8 rounded-full"
                                    >
                                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                                            <Icons.linkedin className="w-5 h-5 text-white" />
                                        </a>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        className="p-0 w-8 h-8 rounded-full"
                                    >
                                        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                                            <Icons.facebook className="w-5 h-5 text-white" />
                                        </a>
                                    </Button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 w-72">
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-bold text-lg">Product</span>
                                </div>
                                <div className="flex flex-col gap-2 text-gray-400 text-sm">
                                    <span>Download</span>
                                    <span>Manifesto</span>
                                    <span>Changelog</span>
                                    <span>Pricing</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 w-72">
                                <span className="text-white font-bold text-lg">Resources</span>
                                <div className="flex flex-col gap-2 text-gray-400 text-sm">
                                    <span>Documentation</span>
                                    <span>API Reference</span>
                                    <span>Community</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 w-72">
                                <span className="text-white font-bold text-lg">Legal</span>
                                <div className="flex flex-col gap-2 text-gray-400 text-sm">
                                    <span>Privacy Policy</span>
                                    <span>Terms of Service</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-center border-t border-[#2A2A2A] pt-8 gap-4">
                            <span className="text-gray-500 text-sm">
                                &copy; 2026 Your Company. All rights reserved.
                            </span>

                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-gray-400 text-sm font-mono">Made with care for modern minds</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
