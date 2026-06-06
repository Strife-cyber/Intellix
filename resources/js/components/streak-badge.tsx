import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakBadgeProps {
    currentStreak: number;
    longestStreak: number;
    className?: string;
}

const StreakBadge: React.FC<StreakBadgeProps> = ({ currentStreak, longestStreak, className }) => {
    const getStreakColor = (streak: number) => {
        if (streak >= 30) return 'text-amber-500 bg-amber-100';
        if (streak >= 14) return 'text-red-500 bg-red-100';
        if (streak >= 7) return 'text-orange-500 bg-orange-100';
        return 'text-yellow-500 bg-yellow-100';
    };

    return (
        <div className={cn(
            'flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium',
            getStreakColor(currentStreak),
            className
        )}>
            <Flame className="h-4 w-4" />
            <span>
                {currentStreak} day{currentStreak !== 1 ? 's' : ''} streak
            </span>
            {currentStreak < longestStreak && (
                <span className="text-xs text-muted-foreground">
                    (Best: {longestStreak})
                </span>
            )}
        </div>
    );
};

export default StreakBadge;
