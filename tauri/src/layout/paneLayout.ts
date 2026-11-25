export type PaneLayoutType =
  | "single"
  | "columns-2"
  | "rows-2"
  | "columns-3"
  | "rows-3"
  | "grid-2x2"
  | "split-left-stacked-right"
  | "split-top-two-bottom";

export type PaneDropEdge = "left" | "right" | "top" | "bottom" | "center";

export type EditorPaneModel = {
  id: string;
  path: string | null;
};

export type PaneLayoutState = {
  layout: PaneLayoutType;
  panes: EditorPaneModel[];
  activePaneId: string;
  splitRatio: number; // primary split ratio (0.2 .. 0.8)
  secondarySplitRatio: number; // secondary split ratio (0.2 .. 0.8)
};

let paneCounter = 1;

export function generatePaneId(): string {
  return `pane-${Date.now().toString(36)}-${(paneCounter++).toString(36)}`;
}

export function createInitialPaneLayout(activePath: string | null = null): PaneLayoutState {
  const primaryId = "pane-primary";
  return {
    layout: "single",
    panes: [{ id: primaryId, path: activePath }],
    activePaneId: primaryId,
    splitRatio: 0.5,
    secondarySplitRatio: 0.5,
  };
}

/**
 * Calculates whether mouse coordinates (normalized 0..1) fall on an edge or the center of a pane.
 * @param x Normalized X position (0 = left, 1 = right)
 * @param y Normalized Y position (0 = top, 1 = bottom)
 * @param edgeThreshold Fraction of dimension considered an edge (default 0.25)
 */
export function calculateDropEdge(
  x: number,
  y: number,
  edgeThreshold = 0.25,
): PaneDropEdge {
  const clampedX = Math.max(0, Math.min(1, x));
  const clampedY = Math.max(0, Math.min(1, y));

  const distLeft = clampedX;
  const distRight = 1 - clampedX;
  const distTop = clampedY;
  const distBottom = 1 - clampedY;

  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

  if (minDist >= edgeThreshold) {
    return "center";
  }

  if (minDist === distLeft) return "left";
  if (minDist === distRight) return "right";
  if (minDist === distTop) return "top";
  return "bottom";
}

/**
 * Required number of panes for a given layout type.
 */
export function requiredPaneCount(layout: PaneLayoutType): number {
  switch (layout) {
    case "single":
      return 1;
    case "columns-2":
    case "rows-2":
      return 2;
    case "columns-3":
    case "rows-3":
    case "split-left-stacked-right":
    case "split-top-two-bottom":
      return 3;
    case "grid-2x2":
      return 4;
  }
}

/**
 * Set the layout mode and adjust the pane list to match the target count.
 */
export function setLayoutType(
  state: PaneLayoutState,
  targetLayout: PaneLayoutType,
  availableTabs: string[] = [],
): PaneLayoutState {
  const targetCount = requiredPaneCount(targetLayout);
  const currentPanes = [...state.panes];

  if (currentPanes.length < targetCount) {
    // Add panes until targetCount is met
    const usedPaths = new Set(currentPanes.map((p) => p.path).filter(Boolean));
    const unusedTabs = availableTabs.filter((t) => !usedPaths.has(t));
    let tabIdx = 0;

    while (currentPanes.length < targetCount) {
      const nextPath =
        unusedTabs[tabIdx] ??
        availableTabs[currentPanes.length % Math.max(1, availableTabs.length)] ??
        currentPanes[0]?.path ??
        null;
      tabIdx++;
      currentPanes.push({
        id: generatePaneId(),
        path: nextPath,
      });
    }
  } else if (currentPanes.length > targetCount) {
    // Keep active pane if possible, shrink to targetCount
    const activeIdx = currentPanes.findIndex((p) => p.id === state.activePaneId);
    if (activeIdx >= targetCount) {
      // Swap active pane into the first position
      const [activePane] = currentPanes.splice(activeIdx, 1);
      currentPanes.unshift(activePane);
    }
    currentPanes.length = targetCount;
  }

  const activePaneStillExists = currentPanes.some((p) => p.id === state.activePaneId);
  const nextActiveId = activePaneStillExists
    ? state.activePaneId
    : currentPanes[0]?.id ?? "pane-primary";

  const defaultSplit =
    targetLayout === "columns-3" || targetLayout === "rows-3" ? 0.33 : state.splitRatio;
  const defaultSecondarySplit =
    targetLayout === "columns-3" || targetLayout === "rows-3" ? 0.67 : state.secondarySplitRatio;

  return {
    ...state,
    layout: targetLayout,
    panes: currentPanes,
    activePaneId: nextActiveId,
    splitRatio: defaultSplit,
    secondarySplitRatio: defaultSecondarySplit,
  };
}

/**
 * Splits a pane or the entire layout in response to an edge drop or split command.
 */
export function splitPane(
  state: PaneLayoutState,
  targetPaneId: string,
  edge: PaneDropEdge,
  newPath: string | null,
): PaneLayoutState {
  if (edge === "center") {
    // Drop into center replaces the pane's open path
    return {
      ...state,
      panes: state.panes.map((p) => (p.id === targetPaneId ? { ...p, path: newPath } : p)),
      activePaneId: targetPaneId,
    };
  }

  const targetIdx = state.panes.findIndex((p) => p.id === targetPaneId);
  if (targetIdx === -1) {
    return state;
  }

  const newPane: EditorPaneModel = {
    id: generatePaneId(),
    path: newPath,
  };

  if (state.layout === "single") {
    if (edge === "left") {
      return {
        ...state,
        layout: "columns-2",
        panes: [newPane, state.panes[0]],
        activePaneId: newPane.id,
      };
    }
    if (edge === "right") {
      return {
        ...state,
        layout: "columns-2",
        panes: [state.panes[0], newPane],
        activePaneId: newPane.id,
      };
    }
    if (edge === "top") {
      return {
        ...state,
        layout: "rows-2",
        panes: [newPane, state.panes[0]],
        activePaneId: newPane.id,
      };
    }
    if (edge === "bottom") {
      return {
        ...state,
        layout: "rows-2",
        panes: [state.panes[0], newPane],
        activePaneId: newPane.id,
      };
    }
  }

  if (state.layout === "columns-2") {
    if (edge === "right" || edge === "left") {
      // 3 columns
      const nextPanes = [...state.panes];
      const insertIdx = edge === "left" ? targetIdx : targetIdx + 1;
      nextPanes.splice(insertIdx, 0, newPane);
      return {
        ...state,
        layout: "columns-3",
        panes: nextPanes,
        activePaneId: newPane.id,
        splitRatio: 0.33,
        secondarySplitRatio: 0.67,
      };
    }

    // Dropping top or bottom on columns-2 converts to 2x2 grid
    // Grid cells: [0: top-left, 1: top-right, 2: bottom-left, 3: bottom-right]
    const col0 = state.panes[0];
    const col1 = state.panes[1];
    let nextPanes: EditorPaneModel[];

    if (targetIdx === 0) {
      if (edge === "top") {
        nextPanes = [
          newPane,
          col1,
          col0,
          { id: generatePaneId(), path: col1.path },
        ];
      } else {
        // edge === "bottom"
        nextPanes = [
          col0,
          col1,
          newPane,
          { id: generatePaneId(), path: col1.path },
        ];
      }
    } else {
      // targetIdx === 1 (right column)
      if (edge === "top") {
        nextPanes = [
          col0,
          newPane,
          { id: generatePaneId(), path: col0.path },
          col1,
        ];
      } else {
        // edge === "bottom"
        nextPanes = [
          col0,
          col1,
          { id: generatePaneId(), path: col0.path },
          newPane,
        ];
      }
    }

    return {
      ...state,
      layout: "grid-2x2",
      panes: nextPanes,
      activePaneId: newPane.id,
      splitRatio: state.splitRatio,
      secondarySplitRatio: 0.5,
    };
  }

  if (state.layout === "rows-2") {
    if (edge === "top" || edge === "bottom") {
      // 3 rows
      const nextPanes = [...state.panes];
      const insertIdx = edge === "top" ? targetIdx : targetIdx + 1;
      nextPanes.splice(insertIdx, 0, newPane);
      return {
        ...state,
        layout: "rows-3",
        panes: nextPanes,
        activePaneId: newPane.id,
        splitRatio: 0.33,
        secondarySplitRatio: 0.67,
      };
    }

    // Dropping left or right on rows-2 converts to 2x2 grid
    // Grid cells: [0: top-left, 1: top-right, 2: bottom-left, 3: bottom-right]
    const row0 = state.panes[0];
    const row1 = state.panes[1];
    let nextPanes: EditorPaneModel[];

    if (targetIdx === 0) {
      if (edge === "left") {
        nextPanes = [
          newPane,
          row0,
          row1,
          { id: generatePaneId(), path: row1.path },
        ];
      } else {
        // edge === "right"
        nextPanes = [
          row0,
          newPane,
          row1,
          { id: generatePaneId(), path: row1.path },
        ];
      }
    } else {
      // targetIdx === 1 (bottom row)
      if (edge === "left") {
        nextPanes = [
          row0,
          { id: generatePaneId(), path: row0.path },
          newPane,
          row1,
        ];
      } else {
        // edge === "right"
        nextPanes = [
          row0,
          { id: generatePaneId(), path: row0.path },
          row1,
          newPane,
        ];
      }
    }

    return {
      ...state,
      layout: "grid-2x2",
      panes: nextPanes,
      activePaneId: newPane.id,
      splitRatio: 0.5,
      secondarySplitRatio: state.splitRatio,
    };
  }

  if (state.layout === "columns-3") {
    if (edge === "top" || edge === "bottom") {
      const p0 = state.panes[0];
      const p1 = state.panes[1];
      const p2 = state.panes[2];
      let nextPanes: EditorPaneModel[];
      if (targetIdx === 0) {
        nextPanes = edge === "top" ? [newPane, p1, p0, p2] : [p0, p1, newPane, p2];
      } else if (targetIdx === 1) {
        nextPanes = edge === "top" ? [p0, newPane, p1, p2] : [p0, p1, p2, newPane];
      } else {
        nextPanes = edge === "top" ? [p0, newPane, p1, p2] : [p0, p1, p2, newPane];
      }
      return {
        ...state,
        layout: "grid-2x2",
        panes: nextPanes,
        activePaneId: newPane.id,
        splitRatio: 0.5,
        secondarySplitRatio: 0.5,
      };
    }
  }

  if (state.layout === "rows-3") {
    if (edge === "left" || edge === "right") {
      const p0 = state.panes[0];
      const p1 = state.panes[1];
      const p2 = state.panes[2];
      let nextPanes: EditorPaneModel[];
      if (targetIdx === 0) {
        nextPanes = edge === "left" ? [newPane, p0, p1, p2] : [p0, newPane, p1, p2];
      } else if (targetIdx === 1) {
        nextPanes = edge === "left" ? [p0, p1, newPane, p2] : [p0, p1, p2, newPane];
      } else {
        nextPanes = edge === "left" ? [p0, p1, newPane, p2] : [p0, p1, p2, newPane];
      }
      return {
        ...state,
        layout: "grid-2x2",
        panes: nextPanes,
        activePaneId: newPane.id,
        splitRatio: 0.5,
        secondarySplitRatio: 0.5,
      };
    }
  }

  // If already at grid-2x2 (or unrecognized), drop into target pane or replace
  return {
    ...state,
    panes: state.panes.map((p, idx) => (idx === targetIdx ? { ...p, path: newPath } : p)),
    activePaneId: targetPaneId,
  };
}

/**
 * Closes a specific pane by id.
 */
export function closePane(state: PaneLayoutState, paneIdToClose: string): PaneLayoutState {
  if (state.panes.length <= 1) {
    return state;
  }

  const remainingPanes = state.panes.filter((p) => p.id !== paneIdToClose);
  let nextLayout = state.layout;

  if (remainingPanes.length === 1) {
    nextLayout = "single";
  } else if (remainingPanes.length === 2) {
    nextLayout =
      state.layout === "rows-3" || state.layout === "rows-2" || state.layout === "split-top-two-bottom"
        ? "rows-2"
        : "columns-2";
  } else if (remainingPanes.length === 3) {
    nextLayout = state.layout === "rows-3" ? "rows-3" : "columns-3";
  }

  const nextActiveId =
    state.activePaneId === paneIdToClose
      ? remainingPanes[0]?.id ?? "pane-primary"
      : state.activePaneId;

  return {
    ...state,
    layout: nextLayout,
    panes: remainingPanes,
    activePaneId: nextActiveId,
  };
}

/**
 * Closes all splits and returns to a single pane.
 */
export function closeAllSplits(state: PaneLayoutState): PaneLayoutState {
  const activePane =
    state.panes.find((p) => p.id === state.activePaneId) ?? state.panes[0];
  return {
    ...state,
    layout: "single",
    panes: [activePane ?? { id: "pane-primary", path: null }],
    activePaneId: activePane ? activePane.id : "pane-primary",
  };
}

/**
 * Focuses the next pane in cyclic order.
 */
export function focusNextPane(state: PaneLayoutState): PaneLayoutState {
  if (state.panes.length <= 1) return state;
  const currentIdx = state.panes.findIndex((p) => p.id === state.activePaneId);
  const nextIdx = (currentIdx + 1) % state.panes.length;
  return {
    ...state,
    activePaneId: state.panes[nextIdx].id,
  };
}

/**
 * Replaces paths of closed tabs across all panes.
 */
export function syncPanesWithTabs(
  state: PaneLayoutState,
  currentTabs: string[],
): PaneLayoutState {
  const tabSet = new Set(currentTabs);
  let changed = false;

  const nextPanes = state.panes.map((pane) => {
    if (pane.path && !tabSet.has(pane.path)) {
      changed = true;
      // find an open tab not already displayed in another pane
      const unusedTab = currentTabs.find((t) => !state.panes.some((p) => p.path === t));
      const fallback = unusedTab ?? (state.panes.length === 1 ? currentTabs[0] ?? null : null);
      return { ...pane, path: fallback };
    }
    return pane;
  });

  if (!changed) return state;
  return {
    ...state,
    panes: nextPanes,
  };
}

/**
 * Restores or normalizes a pane layout state from session storage.
 */
export function restorePaneLayoutFromSession(
  session: {
    split?: boolean;
    splitOrientation?: "right" | "down";
    splitRatio?: number;
    secondary?: string | null;
    paneLayout?: PaneLayoutType;
    panePaths?: string[];
    activePaneIndex?: number;
    secondarySplitRatio?: number;
  } | null,
  activePath: string | null,
): PaneLayoutState {
  if (!session) {
    return createInitialPaneLayout(activePath);
  }

  // If modern multi-pane layout is saved:
  if (session.paneLayout && Array.isArray(session.panePaths) && session.panePaths.length > 0) {
    const panes: EditorPaneModel[] = session.panePaths.map((p, idx) => ({
      id: idx === 0 ? "pane-primary" : `pane-${idx}`,
      path: p,
    }));
    const activeIdx =
      typeof session.activePaneIndex === "number" &&
      session.activePaneIndex >= 0 &&
      session.activePaneIndex < panes.length
        ? session.activePaneIndex
        : 0;

    return {
      layout: session.paneLayout,
      panes,
      activePaneId: panes[activeIdx]?.id ?? panes[0].id,
      splitRatio: typeof session.splitRatio === "number" ? session.splitRatio : 0.5,
      secondarySplitRatio:
        typeof session.secondarySplitRatio === "number" ? session.secondarySplitRatio : 0.5,
    };
  }

  // Fallback to legacy split session
  if (session.split) {
    const orientation = session.splitOrientation === "down" ? "rows-2" : "columns-2";
    const primaryPane: EditorPaneModel = { id: "pane-primary", path: activePath };
    const secondaryPane: EditorPaneModel = {
      id: "pane-secondary",
      path: session.secondary ?? activePath,
    };
    return {
      layout: orientation,
      panes: [primaryPane, secondaryPane],
      activePaneId: primaryPane.id,
      splitRatio: typeof session.splitRatio === "number" ? session.splitRatio : 0.5,
      secondarySplitRatio: 0.5,
    };
  }

  return createInitialPaneLayout(activePath);
}
