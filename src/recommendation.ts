// ============================================
// Recommendation Logic (推薦アルゴリズム)
// ============================================

import type { Env } from './types';
import { dbHelper } from './db';

// Recommendation weights (can be adjusted based on performance)
const WEIGHTS = {
  theme: 0.3,
  tool: 0.25,
  industry: 0.2,
  outcome: 0.15,
  rating: 0.05,
  activity: 0.05
};

interface RecommendationScore {
  instructor_id: number;
  score: number;
  matched_themes: number;
  matched_tools: number;
  matched_industries: number;
  avg_rating: number;
}

/**
 * Calculate recommendation score for instructors based on job requirements
 * 
 * Formula:
 * score = Σ(w_theme * match(theme)) + Σ(w_tool * match(tool)) + 
 *         Σ(w_industry * match(industry)) + w_outcome * match(outcome_tags) + 
 *         w_rating * avg_rating + w_activity * response_rate
 */
export async function recommendInstructors(
  db: D1Database,
  jobId: number,
  limit: number = 10
): Promise<RecommendationScore[]> {
  try {
    // Get job details
    const job = await dbHelper.queryOne<any>(
      db,
      'SELECT * FROM jobs WHERE id = ?',
      [jobId]
    );

    if (!job) {
      return [];
    }

    const jobThemes = dbHelper.parseJSON(job.theme_tags) || [];
    const jobTools = dbHelper.parseJSON(job.tool_tags) || [];
    const jobIndustries = dbHelper.parseJSON(job.industry_tags) || [];

    // Get all verified instructors
    const instructors = await dbHelper.query<any>(
      db,
      `
        SELECT i.*, u.name, u.email
        FROM instructors i
        JOIN users u ON i.user_id = u.id
        WHERE i.verified = 1
      `
    );

    // Calculate scores
    const scores: RecommendationScore[] = [];

    for (const instructor of instructors) {
      const instThemes = dbHelper.parseJSON(instructor.skills) || [];
      const instTools = dbHelper.parseJSON(instructor.tools) || [];
      const instIndustries = dbHelper.parseJSON(instructor.industries) || [];

      // Count matches
      const themeMatches = countMatches(jobThemes, instThemes);
      const toolMatches = countMatches(jobTools, instTools);
      const industryMatches = countMatches(jobIndustries, instIndustries);

      // Get average rating
      const ratingResult = await dbHelper.queryOne<any>(
        db,
        `
          SELECT AVG(rating) as avg_rating 
          FROM reviews 
          WHERE subject_type = 'instructor' AND subject_id = ?
        `,
        [instructor.id]
      );
      const avgRating = ratingResult?.avg_rating || 0;

      // Calculate response rate (percentage of applications vs total jobs seen)
      // For MVP, we'll use a default value
      const responseRate = 0.5; // 50% default

      // Calculate total score
      const score =
        WEIGHTS.theme * (themeMatches / Math.max(jobThemes.length, 1)) +
        WEIGHTS.tool * (toolMatches / Math.max(jobTools.length, 1)) +
        WEIGHTS.industry * (industryMatches / Math.max(jobIndustries.length, 1)) +
        WEIGHTS.rating * (avgRating / 5) +
        WEIGHTS.activity * responseRate;

      scores.push({
        instructor_id: instructor.id,
        score,
        matched_themes: themeMatches,
        matched_tools: toolMatches,
        matched_industries: industryMatches,
        avg_rating: avgRating
      });
    }

    // Sort by score descending and return top N
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, limit);
  } catch (error) {
    console.error('Recommendation error:', error);
    return [];
  }
}

/**
 * Count matching elements between two arrays
 */
function countMatches(arr1: string[], arr2: string[]): number {
  if (!arr1 || !arr2) return 0;
  
  const set1 = new Set(arr1.map(s => s.toLowerCase()));
  const set2 = new Set(arr2.map(s => s.toLowerCase()));
  
  let matches = 0;
  for (const item of set1) {
    if (set2.has(item)) {
      matches++;
    }
  }
  
  return matches;
}

/**
 * Get recommended jobs for an instructor
 */
export async function recommendJobsForInstructor(
  db: D1Database,
  instructorId: number,
  limit: number = 10
): Promise<any[]> {
  try {
    // Get instructor details
    const instructor = await dbHelper.queryOne<any>(
      db,
      'SELECT * FROM instructors WHERE id = ?',
      [instructorId]
    );

    if (!instructor) {
      return [];
    }

    const instThemes = dbHelper.parseJSON(instructor.skills) || [];
    const instTools = dbHelper.parseJSON(instructor.tools) || [];
    const instIndustries = dbHelper.parseJSON(instructor.industries) || [];

    // Get all open jobs
    const jobs = await dbHelper.query<any>(
      db,
      `
        SELECT j.*, o.name as org_name
        FROM jobs j
        JOIN organizations o ON j.org_id = o.id
        WHERE j.status = 'open'
      `
    );

    // Calculate match scores
    const jobScores = jobs.map(job => {
      const jobThemes = dbHelper.parseJSON(job.theme_tags) || [];
      const jobTools = dbHelper.parseJSON(job.tool_tags) || [];
      const jobIndustries = dbHelper.parseJSON(job.industry_tags) || [];

      const themeMatches = countMatches(instThemes, jobThemes);
      const toolMatches = countMatches(instTools, jobTools);
      const industryMatches = countMatches(instIndustries, jobIndustries);

      const score =
        WEIGHTS.theme * (themeMatches / Math.max(instThemes.length, 1)) +
        WEIGHTS.tool * (toolMatches / Math.max(instTools.length, 1)) +
        WEIGHTS.industry * (industryMatches / Math.max(instIndustries.length, 1));

      return {
        ...job,
        match_score: score,
        matched_themes: themeMatches,
        matched_tools: toolMatches,
        matched_industries: industryMatches
      };
    });

    // Sort by score and return top N
    jobScores.sort((a, b) => b.match_score - a.match_score);
    return jobScores.slice(0, limit);
  } catch (error) {
    console.error('Job recommendation error:', error);
    return [];
  }
}
