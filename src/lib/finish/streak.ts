// Finish milestone streak logic

export interface StreakState {
  streak: number;
  lastFinishDate: string | null; // ISO date string (YYYY-MM-DD)
  totalFinishes: number;
}

export interface UserStatsRow {
  user_id: string;
  finish_streak: number;
  last_finish_date: string | null;
  total_finishes: number;
  updated_at: string;
}

/**
 * Compute the new streak after a user reaches "done" state today.
 *
 * Rules:
 * - If lastFinishDate is today → no change (idempotent).
 * - If lastFinishDate is yesterday → streak += 1.
 * - Otherwise (gap > 1 day or first finish) → streak = 1.
 */
export function computeNewStreak(
  current: StreakState,
  today: string = new Date().toISOString().slice(0, 10),
): StreakState {
  if (current.lastFinishDate === today) {
    // Already recorded today — idempotent
    return current;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const newStreak =
    current.lastFinishDate === yesterdayStr ? current.streak + 1 : 1;

  return {
    streak: newStreak,
    lastFinishDate: today,
    totalFinishes: current.totalFinishes + 1,
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";

export async function getUserStats(
  client: SupabaseClient,
  userId: string,
): Promise<StreakState> {
  const { data, error } = await client
    .from("user_stats")
    .select("finish_streak, last_finish_date, total_finishes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { streak: 0, lastFinishDate: null, totalFinishes: 0 };

  const row = data as Pick<UserStatsRow, "finish_streak" | "last_finish_date" | "total_finishes">;
  return {
    streak: row.finish_streak,
    lastFinishDate: row.last_finish_date,
    totalFinishes: row.total_finishes,
  };
}

export async function recordFinish(
  client: SupabaseClient,
  userId: string,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<StreakState> {
  const current = await getUserStats(client, userId);
  const next = computeNewStreak(current, today);

  const { error } = await client.from("user_stats").upsert(
    {
      user_id: userId,
      finish_streak: next.streak,
      last_finish_date: next.lastFinishDate,
      total_finishes: next.totalFinishes,
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
  return next;
}
