import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface TourStep {
    title: string;
    description: string;
    icon?: React.ReactNode;
}

const tourSteps: TourStep[] = [
    {
        title: 'Welcome to Intellix! 🚀',
        description:
            'Your AI-powered study companion. Let us help you learn smarter, not harder. This quick tour will show you the essentials.',
        icon: <Rocket className="h-8 w-8 text-primary" />,
    },
    {
        title: 'Upload Study Materials',
        description:
            'Upload PDFs, documents, and more. Intellix will automatically extract key concepts and help you create flashcards.',
    },
    {
        title: 'Create Notes',
        description:
            'Use the Quick Capture button (the + button) or press Ctrl+K / Cmd+K anywhere to instantly capture ideas and lecture notes.',
    },
    {
        title: 'Study with Flashcards',
        description:
            'Review flashcards using spaced repetition. The Study Planner intelligently schedules reviews so you never forget.',
    },
    {
        title: 'Track Your Progress',
        description:
            'Monitor your streaks, earn badges, and watch your knowledge grow. Consistent daily study is the key to mastery!',
    },
];

const TOUR_STORAGE_KEY = 'intellix_onboarding_completed';

export const OnboardingTour: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const completed = localStorage.getItem(TOUR_STORAGE_KEY);
        if (!completed) {
            // Small delay so the page renders first
            const timer = setTimeout(() => setIsOpen(true), 600);
            return () => clearTimeout(timer);
        }
    }, []);

    const dismissTour = useCallback(() => {
        setIsOpen(false);
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    }, []);

    const nextStep = useCallback(() => {
        if (currentStep < tourSteps.length - 1) {
            setCurrentStep((prev) => prev + 1);
        } else {
            dismissTour();
        }
    }, [currentStep, dismissTour]);

    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') dismissTour();
            if (e.key === 'ArrowRight') nextStep();
            if (e.key === 'ArrowLeft') prevStep();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, nextStep, prevStep, dismissTour]);

    const step = tourSteps[currentStep];

    return (
        <div
            className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
                isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
        >
            <Card className="mx-4 w-full max-w-md shadow-2xl transition-all duration-300">
                <CardHeader className="relative">
                    <button
                        onClick={dismissTour}
                        className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Close tour"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div className="mb-2 flex items-center gap-3">
                        {step.icon}
                        <div>
                            <CardTitle className="text-xl">{step.title}</CardTitle>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <CardDescription className="text-base leading-relaxed text-foreground/80">
                        {step.description}
                    </CardDescription>

                    {/* Step indicators */}
                    <div className="mt-6 flex items-center justify-center gap-2">
                        {tourSteps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                                    idx === currentStep
                                        ? 'w-6 bg-primary'
                                        : 'bg-muted-foreground/30'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="mt-6 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={prevStep}
                            disabled={currentStep === 0}
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Back
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            {currentStep + 1} of {tourSteps.length}
                        </span>
                        <Button size="sm" onClick={nextStep}>
                            {currentStep < tourSteps.length - 1 ? (
                                <>
                                    Next
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </>
                            ) : (
                                'Get Started!'
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export const resetOnboardingTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
};
