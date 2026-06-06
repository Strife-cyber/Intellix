<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserAchievement extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'achievement_type',
        'points',
        'description',
        'badge_name',
        'badge_icon',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function awardAchievement($userId, $type, $points, $description, $badgeName, $badgeIcon)
    {
        return self::create([
            'user_id' => $userId,
            'achievement_type' => $type,
            'points' => $points,
            'description' => $description,
            'badge_name' => $badgeName,
            'badge_icon' => $badgeIcon,
            'is_active' => true,
        ]);
    }

    public static function getUserStreak($userId)
    {
        $user = User::find($userId);
        $currentStreak = $user->current_streak ?? 0;
        $longestStreak = $user->longest_streak ?? 0;

        return [
            'current' => $currentStreak,
            'longest' => $longestStreak,
        ];
    }

    public static function getUserBadges($userId)
    {
        return self::where('user_id', $userId)
            ->where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public static function getUserXP($userId)
    {
        return self::where('user_id', $userId)
            ->sum('points');
    }
}
