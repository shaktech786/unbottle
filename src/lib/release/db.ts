// Supabase data access for release checklists

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReleaseChecklist, ReleaseStep, ReleaseStatus, DistributionStatus } from "./types";
import { createDefaultReleaseSteps, deriveReleaseStatus } from "./types";

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

interface ReleaseChecklistRow {
  id: string;
  session_id: string;
  steps: ReleaseStep[];
  status: string;
  distribution_status: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ReleaseChecklistRow): ReleaseChecklist {
  return {
    id: row.id,
    sessionId: row.session_id,
    steps: Array.isArray(row.steps) ? row.steps : [],
    status: row.status as ReleaseStatus,
    distributionStatus: row.distribution_status as DistributionStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getReleaseChecklist(
  client: SupabaseClient,
  sessionId: string,
): Promise<ReleaseChecklist | null> {
  const { data, error } = await client
    .from("release_checklists")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRow(data as ReleaseChecklistRow);
}

export async function getOrCreateReleaseChecklist(
  client: SupabaseClient,
  sessionId: string,
): Promise<ReleaseChecklist> {
  const existing = await getReleaseChecklist(client, sessionId);
  if (existing) return existing;

  const steps = createDefaultReleaseSteps();
  const { data, error } = await client
    .from("release_checklists")
    .insert({ session_id: sessionId, steps, status: "draft", distribution_status: "not_submitted" })
    .select("*")
    .single();

  if (error) throw error;
  return mapRow(data as ReleaseChecklistRow);
}

export async function updateReleaseChecklist(
  client: SupabaseClient,
  id: string,
  updates: { steps?: ReleaseStep[]; distributionStatus?: DistributionStatus },
): Promise<ReleaseChecklist> {
  const row: Record<string, unknown> = {};
  if (updates.steps !== undefined) {
    row.steps = updates.steps;
    row.status = deriveReleaseStatus(updates.steps);
  }
  if (updates.distributionStatus !== undefined) {
    row.distribution_status = updates.distributionStatus;
  }

  const { data, error } = await client
    .from("release_checklists")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapRow(data as ReleaseChecklistRow);
}
