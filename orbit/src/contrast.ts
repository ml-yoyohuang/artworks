const INK_DISPLAY: Record<string, string> = {
  '#b7402e': '#8a2112', '#234f68': '#103d5b', '#3a654f': '#174c32',
  '#955477': '#742450', '#af682d': '#794006', '#3d3d38': '#171b17',
};
/** Display only: stored ink and exports keep their original colors and line weights. */
export function displayInk(color: string, highContrast: boolean): string {
  return highContrast ? INK_DISPLAY[color] ?? color : color;
}
