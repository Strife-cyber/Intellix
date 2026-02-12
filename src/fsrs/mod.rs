//! FSRS Engine: spaced repetition scheduler calculations.
//! Processes review data from Laravel and returns updated scheduling values.

use chrono::Utc;
use fsrs::{FSRS, MemoryState};
use serde::{Deserialize, Serialize};

/// Rating values: 1=Again, 2=Hard, 3=Good, 4=Easy
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Rating {
    Again = 1,
    Hard = 2,
    Good = 3,
    Easy = 4,
}

impl From<Rating> for u32 {
    fn from(rating: Rating) -> Self {
        rating as u32
    }
}

/// Input for a single review calculation.
#[derive(Debug, Deserialize)]
pub struct ReviewInput {
    /// Previous interval length in days
    pub last_interval: f32,
    /// Current difficulty estimate (typically 0.0-10.0)
    pub difficulty: f32,
    /// Current stability estimate (days for retrievability to drop to 90%)
    /// If not provided, will be derived from last_interval
    #[serde(default)]
    pub stability: Option<f32>,
    /// User feedback rating
    pub rating: Rating,
}

/// Output for a single review calculation.
#[derive(Debug, Serialize)]
pub struct ReviewOutput {
    /// New interval in days
    pub new_interval: f32,
    /// Updated stability value
    pub stability: f32,
    /// Updated difficulty value
    pub difficulty: f32,
    /// Next review timestamp (ISO8601)
    pub next_review: String,
}

/// Batch input: multiple reviews to process.
#[derive(Debug, Deserialize)]
pub struct BatchInput {
    pub reviews: Vec<ReviewInput>,
}

/// Batch output: results for all reviews.
#[derive(Debug, Serialize)]
pub struct BatchOutput {
    pub ok: bool,
    pub results: Vec<ReviewOutput>,
}

/// Error output (stderr, non-zero exit).
#[derive(Debug, Serialize)]
pub struct FSRSError {
    pub ok: bool,
    pub error: String,
    pub code: i32,
}

/// Desired retention rate (90% = 0.9)
const DESIRED_RETENTION: f32 = 0.9;

/// Default FSRS parameters (FSRS-6 defaults from the fsrs crate)
const DEFAULT_PARAMETERS: &[f32] = &[
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796,
    1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];

/// Process a single review and return updated scheduling values.
pub fn process_review(input: ReviewInput) -> Result<ReviewOutput, FSRSError> {
    let fsrs = FSRS::new(Some(DEFAULT_PARAMETERS)).map_err(|e| FSRSError {
        ok: false,
        error: format!("Failed to initialize FSRS: {}", e),
        code: 40,
    })?;

    // Derive stability from last_interval if not provided
    // For FSRS, stability ≈ interval when retention is at desired level
    let stability = input
        .stability
        .unwrap_or_else(|| input.last_interval.max(0.1));

    let memory_state = MemoryState {
        stability,
        difficulty: input.difficulty,
    };

    // Calculate days elapsed (for a review happening now, this is the last interval)
    let days_elapsed = input.last_interval.max(0.0) as u32;

    // Get next states for all ratings, then select the one matching the user's rating
    let next_states = fsrs.next_states(Some(memory_state), DESIRED_RETENTION, days_elapsed)
        .map_err(|e| FSRSError {
            ok: false,
            error: format!("FSRS calculation failed: {}", e),
            code: 41,
        })?;

    let selected_state = match input.rating {
        Rating::Again => &next_states.again,
        Rating::Hard => &next_states.hard,
        Rating::Good => &next_states.good,
        Rating::Easy => &next_states.easy,
    };

    let new_interval = selected_state.interval;
    let updated_stability = selected_state.memory.stability;
    let updated_difficulty = selected_state.memory.difficulty;

    // Calculate next review timestamp
    let now = Utc::now();
    let next_review = now + chrono::Duration::days(new_interval as i64);

    Ok(ReviewOutput {
        new_interval,
        stability: updated_stability,
        difficulty: updated_difficulty,
        next_review: next_review.to_rfc3339(),
    })
}

/// Process a batch of reviews.
pub fn process_batch(input: BatchInput) -> Result<BatchOutput, FSRSError> {
    if input.reviews.is_empty() {
        return Err(FSRSError {
            ok: false,
            error: "No reviews provided".to_string(),
            code: 42,
        });
    }

    let mut results = Vec::with_capacity(input.reviews.len());
    for (idx, review) in input.reviews.into_iter().enumerate() {
        match process_review(review) {
            Ok(output) => results.push(output),
            Err(e) => {
                return Err(FSRSError {
                    ok: false,
                    error: format!("Review {} failed: {}", idx + 1, e.error),
                    code: e.code,
                });
            }
        }
    }

    Ok(BatchOutput {
        ok: true,
        results,
    })
}
