/** Limits yaw using actual requested translation, without forcing a minimum speed or adding energy. */
export function boundedTurn(requestedTurn: number, speed: number, radius: number): number {
  if (radius <= 0) return requestedTurn;
  if (speed <= 0) return 0;
  const limit = Math.max(0, speed) / radius;
  return Math.max(-limit, Math.min(limit, requestedTurn));
}
