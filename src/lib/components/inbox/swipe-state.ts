export interface SwipeState {
  onMove(dx: number): number;
  onRelease(dx: number): "commit-left" | "commit-right" | "rebound";
  onCancel(): "rebound";
}

export function createSwipeState(rowWidth: number): SwipeState {
  const threshold = rowWidth * 0.4;

  return {
    onMove(dx: number): number {
      return Math.max(-rowWidth, Math.min(rowWidth, dx));
    },

    onRelease(dx: number): "commit-left" | "commit-right" | "rebound" {
      if (dx <= -threshold) return "commit-left";
      if (dx >= threshold) return "commit-right";
      return "rebound";
    },

    onCancel(): "rebound" {
      return "rebound";
    },
  };
}
