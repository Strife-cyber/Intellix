<?php

namespace App\Http\Controllers;

use App\Models\FlashCard;
use App\Models\Resource;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StudyPlannerController extends Controller
{
    /**
     * Get study planner data for calendar view
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $start = $request->input('start', now()->startOfMonth());
        $end = $request->input('end', now()->endOfMonth());
        
        $startDate = Carbon::parse($start);
        $endDate = Carbon::parse($end);
        
        // Get due flashcards for each day in the period
        $studySchedule = [];
        $period = CarbonPeriod::create($startDate, $endDate);
        
        foreach ($period as $date) {
            $dueFlashcards = FlashCard::forUser($user->id)
                ->due()
                ->whereDate('next_review', $date->format('Y-m-d'))
                ->with(['resource'])
                ->get();
                
            $studySchedule[] = [
                'date' => $date->format('Y-m-d'),
                'due_count' => $dueFlashcards->count(),
                'flashcards' => $dueFlashcards->map(function ($card) {
                    return [
                        'id' => $card->id,
                        'front' => $card->front,
                        'resource_title' => $card->resource->original_name ?? 'Unknown',
                        'interval_days' => $card->interval_days,
                        'difficulty' => $card->difficulty,
                    ];
                }),
                'total_study_time' => $dueFlashcards->count() * 2, // Estimated 2 minutes per card
            ];
        }
        
        // Get study statistics
        $totalDue = FlashCard::forUser($user->id)
            ->due()
            ->where('next_review', '<=', $endDate)
            ->count();
            
        $overdueCount = FlashCard::forUser($user->id)
            ->due()
            ->where('next_review', '<', now())
            ->count();
        
        return response()->json([
            'schedule' => $studySchedule,
            'stats' => [
                'total_due' => $totalDue,
                'overdue_count' => $overdueCount,
                'due_today' => FlashCard::forUser($user->id)->due()->whereDate('next_review', today())->count(),
                'total_flashcards' => FlashCard::forUser($user->id)->count(),
            ],
            'study_streak' => $this->calculateStudyStreak($user),
        ]);
    }
    
    /**
     * Get optimal study schedule recommendations
     */
    public function recommendations(Request $request): JsonResponse
    {
        $user = Auth::user();
        $daysAhead = $request->input('days', 7);
        
        // Get upcoming due cards (including today)
        $upcomingCards = FlashCard::forUser($user->id)
            ->where('next_review', '<=', now()->addDays($daysAhead))
            ->where('next_review', '>=', now()->startOfDay())
            ->orderBy('next_review')
            ->with(['resource'])
            ->get();
        
        // Group by resource for study sessions
        $sessions = [];
        foreach ($upcomingCards as $card) {
            $resourceId = $card->resource_id;
            $reviewDate = Carbon::parse($card->next_review)->format('Y-m-d');
            
            if (!isset($sessions[$reviewDate])) {
                $sessions[$reviewDate] = [];
            }
            
            if (!isset($sessions[$reviewDate][$resourceId])) {
                $sessions[$reviewDate][$resourceId] = [
                    'resource_id' => $resourceId,
                    'resource_title' => $card->resource->original_name ?? 'Unknown',
                    'cards' => [],
                    'estimated_time' => 0,
                    'priority' => 'medium',
                ];
            }
            
            $sessions[$reviewDate][$resourceId]['cards'][] = [
                'id' => $card->id,
                'front' => substr($card->front, 0, 100) . (strlen($card->front) > 100 ? '...' : ''),
            ];
            
            $sessions[$reviewDate][$resourceId]['estimated_time'] += 2; // 2 minutes per card
            
            // Set priority based on difficulty and interval
            if ($card->difficulty > 7.0 || $card->interval_days < 3) {
                $sessions[$reviewDate][$resourceId]['priority'] = 'high';
            } elseif ($card->difficulty < 4.0 && $card->interval_days > 14) {
                $sessions[$reviewDate][$resourceId]['priority'] = 'low';
            }
        }
        
        // Flatten and sort sessions
        $recommendations = [];
        foreach ($sessions as $date => $dateSessions) {
            foreach ($dateSessions as $session) {
                $recommendations[] = array_merge($session, ['date' => $date]);
            }
        }
        
        // Sort by date and priority
        usort($recommendations, function ($a, $b) {
            if ($a['date'] !== $b['date']) {
                return strcmp($a['date'], $b['date']);
            }
            
            $priorityOrder = ['high' => 0, 'medium' => 1, 'low' => 2];
            return $priorityOrder[$a['priority']] - $priorityOrder[$b['priority']];
        });
        
        return response()->json([
            'recommendations' => array_slice($recommendations, 0, 10), // Top 10 recommendations
            'total_sessions' => count($recommendations),
        ]);
    }
    
    /**
     * Generate a study plan for the next N days
     */
    public function generatePlan(Request $request): JsonResponse
    {
        $user = Auth::user();
        $days = $request->input('days', 7);
        $maxDailyTime = $request->input('max_daily_time', 30); // Maximum minutes per day
        
        $plan = [];
        $startDate = now();
        
        for ($i = 0; $i < $days; $i++) {
            $currentDate = $startDate->copy()->addDays($i);
            $dateStr = $currentDate->format('Y-m-d');
            
            // Get cards due on this date
            $dueCards = FlashCard::forUser($user->id)
                ->whereDate('next_review', $currentDate)
                ->with(['resource'])
                ->get();
            
            // If no cards due, check if we should schedule review of older cards
            if ($dueCards->isEmpty() && $i > 0) {
                $dueCards = FlashCard::forUser($user->id)
                    ->where('next_review', '<=', $currentDate)
                    ->orderByDesc('last_reviewed_at')
                    ->limit(10) // Max 10 cards for catch-up
                    ->with(['resource'])
                    ->get();
            }
            
            // Group by resource and calculate time
            $sessions = [];
            $totalTime = 0;
            
            foreach ($dueCards as $card) {
                $resourceId = $card->resource_id;
                
                if (!isset($sessions[$resourceId])) {
                    $sessions[$resourceId] = [
                        'resource_id' => $resourceId,
                        'resource_title' => $card->resource->original_name ?? 'Unknown',
                        'cards_count' => 0,
                        'estimated_time' => 0,
                    ];
                }
                
                $sessions[$resourceId]['cards_count']++;
                $sessions[$resourceId]['estimated_time'] += 2; // 2 minutes per card
                $totalTime += 2;
            }
            
            // Adjust if exceeding max daily time
            if ($totalTime > $maxDailyTime) {
                $ratio = $maxDailyTime / $totalTime;
                foreach ($sessions as &$session) {
                    $session['estimated_time'] = (int)($session['estimated_time'] * $ratio);
                    $session['cards_count'] = (int)($session['cards_count'] * $ratio);
                }
            }
            
            $plan[] = [
                'date' => $dateStr,
                'day_name' => $currentDate->format('l'),
                'sessions' => array_values($sessions),
                'total_time' => min($totalTime, $maxDailyTime),
                'is_today' => $currentDate->isToday(),
                'is_weekend' => $currentDate->isWeekend(),
            ];
        }
        
        // Calculate summary
        $totalSessions = 0;
        foreach ($plan as $day) {
            $totalSessions += array_sum(array_column($day['sessions'], 'cards_count'));
        }
        
        return response()->json([
            'plan' => $plan,
            'summary' => [
                'total_days' => $days,
                'total_sessions' => $totalSessions,
                'estimated_total_time' => array_sum(array_column($plan, 'total_time')),
                'avg_daily_time' => array_sum(array_column($plan, 'total_time')) / $days,
            ],
        ]);
    }
    
    /**
     * Calculate user's study streak
     */
    private function calculateStudyStreak(User $user): array
    {
        // Get last 30 days of study activity
        $thirtyDaysAgo = now()->subDays(30);
        
        $studyDays = FlashCard::forUser($user->id)
            ->whereNotNull('last_reviewed_at')
            ->where('last_reviewed_at', '>=', $thirtyDaysAgo)
            ->selectRaw('DATE(last_reviewed_at) as study_date')
            ->distinct()
            ->pluck('study_date')
            ->sort()
            ->toArray();
        
        if (empty($studyDays)) {
            return [
                'current' => 0,
                'longest' => 0,
                'last_study_date' => null,
            ];
        }
        
        $currentStreak = 0;
        $longestStreak = 0;
        $tempStreak = 0;
        
        $checkDate = now();
        
        // Check current streak (consecutive days ending today or yesterday)
        while (in_array($checkDate->format('Y-m-d'), $studyDays)) {
            $currentStreak++;
            $checkDate->subDay();
        }
        
        // Calculate longest streak
        $studyDaysSorted = array_values($studyDays);
        for ($i = 0; $i < count($studyDaysSorted); $i++) {
            if ($i === 0) {
                $tempStreak = 1;
            } else {
                $prevDate = Carbon::parse($studyDaysSorted[$i - 1]);
                $currentDate = Carbon::parse($studyDaysSorted[$i]);
                
                if ($currentDate->diffInDays($prevDate) === 1) {
                    $tempStreak++;
                } else {
                    $longestStreak = max($longestStreak, $tempStreak);
                    $tempStreak = 1;
                }
            }
        }
        
        $longestStreak = max($longestStreak, $tempStreak);
        
        return [
            'current' => $currentStreak,
            'longest' => $longestStreak,
            'last_study_date' => end($studyDays),
        ];
    }
}
