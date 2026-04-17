import { describe, it, expect } from "vitest";
import { buildSessionTree } from "./branch-tree";
import type { Session } from "@/lib/music/types";

function makeSession(id: string, parentBranchId?: string): Session {
  return {
    id,
    userId: "user-1",
    title: `Session ${id}`,
    status: "active",
    bpm: 120,
    keySignature: "C",
    timeSignature: "4/4",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    lastActiveAt: "2024-01-01T00:00:00Z",
    parentBranchId,
  };
}

describe("buildSessionTree", () => {
  it("handles empty input", () => {
    expect(buildSessionTree([])).toEqual([]);
  });

  it("builds a flat list (no forks) — all sessions are roots", () => {
    const sessions = [makeSession("1"), makeSession("2"), makeSession("3")];
    const tree = buildSessionTree(sessions);
    expect(tree).toHaveLength(3);
    tree.forEach((node) => expect(node.children).toHaveLength(0));
  });

  it("builds a tree with one fork", () => {
    const sessions = [
      makeSession("root"),
      makeSession("child", "root"),
    ];
    const tree = buildSessionTree(sessions);
    expect(tree).toHaveLength(1);
    expect(tree[0].session.id).toBe("root");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].session.id).toBe("child");
  });

  it("builds nested forks (grandchild)", () => {
    const sessions = [
      makeSession("root"),
      makeSession("child", "root"),
      makeSession("grandchild", "child"),
    ];
    const tree = buildSessionTree(sessions);
    expect(tree).toHaveLength(1);
    expect(tree[0].session.id).toBe("root");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].session.id).toBe("grandchild");
  });

  it("treats orphaned fork (parent not in list) as root", () => {
    const sessions = [
      makeSession("child", "missing-parent"),
      makeSession("root"),
    ];
    const tree = buildSessionTree(sessions);
    // Both should be roots since "missing-parent" is not in the list
    expect(tree).toHaveLength(2);
    const ids = tree.map((n) => n.session.id);
    expect(ids).toContain("child");
    expect(ids).toContain("root");
  });

  it("handles multiple children on same parent", () => {
    const sessions = [
      makeSession("root"),
      makeSession("child-a", "root"),
      makeSession("child-b", "root"),
    ];
    const tree = buildSessionTree(sessions);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(2);
  });

  it("each node has correct session reference", () => {
    const sessions = [makeSession("a"), makeSession("b", "a")];
    const tree = buildSessionTree(sessions);
    expect(tree[0].session).toBe(sessions[0]);
    expect(tree[0].children[0].session).toBe(sessions[1]);
  });
});
