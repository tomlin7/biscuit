import { describe, expect, it } from "bun:test";
import {
  calculateDropEdge,
  closeAllSplits,
  closePane,
  createInitialPaneLayout,
  focusNextPane,
  requiredPaneCount,
  restorePaneLayoutFromSession,
  setLayoutType,
  splitPane,
  syncPanesWithTabs,
  type PaneLayoutState,
} from "./paneLayout";

describe("paneLayout", () => {
  describe("calculateDropEdge", () => {
    it("identifies left edge when within threshold", () => {
      expect(calculateDropEdge(0.1, 0.5, 0.25)).toBe("left");
      expect(calculateDropEdge(0.05, 0.8, 0.25)).toBe("left");
    });

    it("identifies right edge when within threshold", () => {
      expect(calculateDropEdge(0.9, 0.5, 0.25)).toBe("right");
      expect(calculateDropEdge(0.95, 0.2, 0.25)).toBe("right");
    });

    it("identifies top edge when within threshold", () => {
      expect(calculateDropEdge(0.5, 0.1, 0.25)).toBe("top");
      expect(calculateDropEdge(0.6, 0.05, 0.25)).toBe("top");
    });

    it("identifies bottom edge when within threshold", () => {
      expect(calculateDropEdge(0.5, 0.9, 0.25)).toBe("bottom");
      expect(calculateDropEdge(0.4, 0.95, 0.25)).toBe("bottom");
    });

    it("identifies center when outside edge threshold", () => {
      expect(calculateDropEdge(0.5, 0.5, 0.25)).toBe("center");
      expect(calculateDropEdge(0.4, 0.6, 0.25)).toBe("center");
      expect(calculateDropEdge(0.3, 0.3, 0.25)).toBe("center");
    });

    it("clamps out-of-range coordinates cleanly", () => {
      expect(calculateDropEdge(-0.5, 0.5)).toBe("left");
      expect(calculateDropEdge(1.5, 0.5)).toBe("right");
      expect(calculateDropEdge(0.5, -0.5)).toBe("top");
      expect(calculateDropEdge(0.5, 1.5)).toBe("bottom");
    });
  });

  describe("requiredPaneCount", () => {
    it("returns correct count for each layout type", () => {
      expect(requiredPaneCount("single")).toBe(1);
      expect(requiredPaneCount("columns-2")).toBe(2);
      expect(requiredPaneCount("rows-2")).toBe(2);
      expect(requiredPaneCount("columns-3")).toBe(3);
      expect(requiredPaneCount("rows-3")).toBe(3);
      expect(requiredPaneCount("split-left-stacked-right")).toBe(3);
      expect(requiredPaneCount("split-top-two-bottom")).toBe(3);
      expect(requiredPaneCount("grid-2x2")).toBe(4);
    });
  });

  describe("createInitialPaneLayout", () => {
    it("creates a single pane layout with activePath", () => {
      const state = createInitialPaneLayout("src/index.ts");
      expect(state.layout).toBe("single");
      expect(state.panes).toHaveLength(1);
      expect(state.panes[0].path).toBe("src/index.ts");
      expect(state.activePaneId).toBe(state.panes[0].id);
      expect(state.splitRatio).toBe(0.5);
    });

    it("handles null activePath", () => {
      const state = createInitialPaneLayout(null);
      expect(state.layout).toBe("single");
      expect(state.panes[0].path).toBeNull();
    });
  });

  describe("splitPane", () => {
    it("splits single pane to the right", () => {
      const init = createInitialPaneLayout("file1.ts");
      const next = splitPane(init, init.panes[0].id, "right", "file2.ts");

      expect(next.layout).toBe("columns-2");
      expect(next.panes).toHaveLength(2);
      expect(next.panes[0].path).toBe("file1.ts");
      expect(next.panes[1].path).toBe("file2.ts");
      expect(next.activePaneId).toBe(next.panes[1].id);
    });

    it("splits single pane to the left", () => {
      const init = createInitialPaneLayout("file1.ts");
      const next = splitPane(init, init.panes[0].id, "left", "file2.ts");

      expect(next.layout).toBe("columns-2");
      expect(next.panes).toHaveLength(2);
      expect(next.panes[0].path).toBe("file2.ts");
      expect(next.panes[1].path).toBe("file1.ts");
      expect(next.activePaneId).toBe(next.panes[0].id);
    });

    it("splits single pane downwards", () => {
      const init = createInitialPaneLayout("file1.ts");
      const next = splitPane(init, init.panes[0].id, "bottom", "file2.ts");

      expect(next.layout).toBe("rows-2");
      expect(next.panes).toHaveLength(2);
      expect(next.panes[0].path).toBe("file1.ts");
      expect(next.panes[1].path).toBe("file2.ts");
    });

    it("splits single pane upwards", () => {
      const init = createInitialPaneLayout("file1.ts");
      const next = splitPane(init, init.panes[0].id, "top", "file2.ts");

      expect(next.layout).toBe("rows-2");
      expect(next.panes).toHaveLength(2);
      expect(next.panes[0].path).toBe("file2.ts");
      expect(next.panes[1].path).toBe("file1.ts");
    });

    it("splits two columns into 2x2 grid when dropping on bottom", () => {
      const init = createInitialPaneLayout("file1.ts");
      const twoCols = splitPane(init, init.panes[0].id, "right", "file2.ts");
      const quad = splitPane(twoCols, twoCols.panes[1].id, "bottom", "file3.ts");

      expect(quad.layout).toBe("grid-2x2");
      expect(quad.panes).toHaveLength(4);
      expect(quad.panes[2].path).toBe("file3.ts");
    });

    it("splits two columns into 3 columns when dropping on right", () => {
      const init = createInitialPaneLayout("file1.ts");
      const twoCols = splitPane(init, init.panes[0].id, "right", "file2.ts");
      const threeCols = splitPane(twoCols, twoCols.panes[1].id, "right", "file3.ts");

      expect(threeCols.layout).toBe("columns-3");
      expect(threeCols.panes).toHaveLength(3);
      expect(threeCols.panes[0].path).toBe("file1.ts");
      expect(threeCols.panes[1].path).toBe("file2.ts");
      expect(threeCols.panes[2].path).toBe("file3.ts");
    });

    it("updates target pane path when dropped on center", () => {
      const init = createInitialPaneLayout("file1.ts");
      const next = splitPane(init, init.panes[0].id, "center", "replaced.ts");

      expect(next.layout).toBe("single");
      expect(next.panes).toHaveLength(1);
      expect(next.panes[0].path).toBe("replaced.ts");
    });
  });

  describe("setLayoutType", () => {
    it("expands single layout to grid-2x2 using available tabs", () => {
      const init = createInitialPaneLayout("a.ts");
      const available = ["a.ts", "b.ts", "c.ts", "d.ts"];
      const grid = setLayoutType(init, "grid-2x2", available);

      expect(grid.layout).toBe("grid-2x2");
      expect(grid.panes).toHaveLength(4);
      expect(grid.panes[0].path).toBe("a.ts");
      expect(grid.panes[1].path).toBe("b.ts");
      expect(grid.panes[2].path).toBe("c.ts");
      expect(grid.panes[3].path).toBe("d.ts");
    });

    it("shrinks grid-2x2 to single while preserving active pane", () => {
      const init = createInitialPaneLayout("a.ts");
      const grid = setLayoutType(init, "grid-2x2", ["a.ts", "b.ts", "c.ts", "d.ts"]);
      grid.activePaneId = grid.panes[2].id; // active is c.ts

      const single = setLayoutType(grid, "single");
      expect(single.layout).toBe("single");
      expect(single.panes).toHaveLength(1);
      expect(single.panes[0].path).toBe("c.ts");
      expect(single.activePaneId).toBe(single.panes[0].id);
    });
  });

  describe("closePane", () => {
    it("drops from 2 panes to single", () => {
      const init = createInitialPaneLayout("a.ts");
      const two = splitPane(init, init.panes[0].id, "right", "b.ts");
      const single = closePane(two, two.panes[1].id);

      expect(single.layout).toBe("single");
      expect(single.panes).toHaveLength(1);
      expect(single.panes[0].path).toBe("a.ts");
    });

    it("drops from grid-2x2 to 3 panes and maintains active pane", () => {
      const init = createInitialPaneLayout("a.ts");
      const grid = setLayoutType(init, "grid-2x2", ["a.ts", "b.ts", "c.ts", "d.ts"]);
      const closed = closePane(grid, grid.panes[3].id);

      expect(closed.panes).toHaveLength(3);
      expect(closed.panes.some((p) => p.id === grid.panes[3].id)).toBe(false);
    });

    it("does not remove the last remaining pane", () => {
      const init = createInitialPaneLayout("a.ts");
      const same = closePane(init, init.panes[0].id);
      expect(same.panes).toHaveLength(1);
    });
  });

  describe("closeAllSplits", () => {
    it("resets multi-pane layout to single pane with active tab", () => {
      const init = createInitialPaneLayout("a.ts");
      const grid = setLayoutType(init, "grid-2x2", ["a.ts", "b.ts", "c.ts", "d.ts"]);
      grid.activePaneId = grid.panes[1].id; // b.ts is active

      const single = closeAllSplits(grid);
      expect(single.layout).toBe("single");
      expect(single.panes).toHaveLength(1);
      expect(single.panes[0].path).toBe("b.ts");
    });
  });

  describe("focusNextPane", () => {
    it("cycles through panes in order", () => {
      const init = createInitialPaneLayout("a.ts");
      const grid = setLayoutType(init, "grid-2x2", ["a.ts", "b.ts", "c.ts", "d.ts"]);
      expect(grid.activePaneId).toBe(grid.panes[0].id);

      const f1 = focusNextPane(grid);
      expect(f1.activePaneId).toBe(grid.panes[1].id);

      const f2 = focusNextPane(f1);
      expect(f2.activePaneId).toBe(grid.panes[2].id);

      const f3 = focusNextPane(f2);
      expect(f3.activePaneId).toBe(grid.panes[3].id);

      const f4 = focusNextPane(f3);
      expect(f4.activePaneId).toBe(grid.panes[0].id);
    });
  });

  describe("syncPanesWithTabs", () => {
    it("replaces closed tab path with an available tab", () => {
      const state: PaneLayoutState = {
        layout: "columns-2",
        panes: [
          { id: "p1", path: "file1.ts" },
          { id: "p2", path: "file2.ts" },
        ],
        activePaneId: "p1",
        splitRatio: 0.5,
        secondarySplitRatio: 0.5,
      };

      // file2.ts closed, only file1.ts and file3.ts remain
      const synced = syncPanesWithTabs(state, ["file1.ts", "file3.ts"]);
      expect(synced.panes[0].path).toBe("file1.ts");
      expect(synced.panes[1].path).toBe("file3.ts");
    });
  });

  describe("restorePaneLayoutFromSession", () => {
    it("restores modern multi-pane layout", () => {
      const session = {
        paneLayout: "grid-2x2" as const,
        panePaths: ["1.ts", "2.ts", "3.ts", "4.ts"],
        activePaneIndex: 2,
        splitRatio: 0.6,
      };
      const restored = restorePaneLayoutFromSession(session, "1.ts");
      expect(restored.layout).toBe("grid-2x2");
      expect(restored.panes).toHaveLength(4);
      expect(restored.panes[2].path).toBe("3.ts");
      expect(restored.activePaneId).toBe(restored.panes[2].id);
      expect(restored.splitRatio).toBe(0.6);
    });

    it("restores legacy split session", () => {
      const legacySession = {
        split: true,
        splitOrientation: "down" as const,
        secondary: "b.ts",
      };
      const restored = restorePaneLayoutFromSession(legacySession, "a.ts");
      expect(restored.layout).toBe("rows-2");
      expect(restored.panes).toHaveLength(2);
      expect(restored.panes[0].path).toBe("a.ts");
      expect(restored.panes[1].path).toBe("b.ts");
    });
  });
});
