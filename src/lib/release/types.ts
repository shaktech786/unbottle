// Release pipeline domain types

export type ReleaseStepCategory = "mastering" | "metadata" | "distribution";

export interface ReleaseStep {
  id: string;
  label: string;
  category: ReleaseStepCategory;
  completed: boolean;
  notes?: string;
}

export type ReleaseStatus = "draft" | "in_progress" | "released";

export type DistributionStatus =
  | "not_submitted"
  | "submitted"
  | "distributed"
  | "live";

export interface ReleaseChecklist {
  id: string;
  sessionId: string;
  steps: ReleaseStep[];
  status: ReleaseStatus;
  distributionStatus: DistributionStatus;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Default steps per release workflow
// ---------------------------------------------------------------------------

export function createDefaultReleaseSteps(): ReleaseStep[] {
  return [
    // Mastering
    {
      id: "master-level",
      label: "Check master level (no clipping, target -14 LUFS)",
      category: "mastering",
      completed: false,
    },
    {
      id: "master-eq",
      label: "Apply mastering EQ and limiting",
      category: "mastering",
      completed: false,
    },
    {
      id: "master-export",
      label: "Export 24-bit WAV at 44.1 kHz",
      category: "mastering",
      completed: false,
    },
    // Metadata
    {
      id: "meta-title",
      label: "Set track title",
      category: "metadata",
      completed: false,
    },
    {
      id: "meta-artist",
      label: "Set artist name",
      category: "metadata",
      completed: false,
    },
    {
      id: "meta-genre",
      label: "Set genre and BPM",
      category: "metadata",
      completed: false,
    },
    {
      id: "meta-artwork",
      label: "Attach cover artwork (3000x3000 JPEG)",
      category: "metadata",
      completed: false,
    },
    // Distribution
    {
      id: "dist-isrc",
      label: "Obtain ISRC code",
      category: "distribution",
      completed: false,
    },
    {
      id: "dist-submit",
      label: "Submit to distribution platform",
      category: "distribution",
      completed: false,
    },
    {
      id: "dist-socials",
      label: "Schedule social media announcement",
      category: "distribution",
      completed: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// Derive overall status from step completion
// ---------------------------------------------------------------------------

export function deriveReleaseStatus(steps: ReleaseStep[]): ReleaseStatus {
  if (steps.every((s) => s.completed)) return "released";
  if (steps.some((s) => s.completed)) return "in_progress";
  return "draft";
}
