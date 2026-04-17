import type { Session } from "@/lib/music/types";

export interface SessionTreeNode {
  session: Session;
  children: SessionTreeNode[];
}

/**
 * Builds a tree of sessions from a flat list using parentBranchId relationships.
 * Sessions whose parentBranchId is not found in the list are treated as roots.
 */
export function buildSessionTree(sessions: Session[]): SessionTreeNode[] {
  const nodeMap = new Map<string, SessionTreeNode>();

  // Create a node for each session
  for (const session of sessions) {
    nodeMap.set(session.id, { session, children: [] });
  }

  const roots: SessionTreeNode[] = [];

  for (const session of sessions) {
    const node = nodeMap.get(session.id)!;
    if (session.parentBranchId && nodeMap.has(session.parentBranchId)) {
      // Attach to parent
      nodeMap.get(session.parentBranchId)!.children.push(node);
    } else {
      // No parent in list — treat as root
      roots.push(node);
    }
  }

  return roots;
}
