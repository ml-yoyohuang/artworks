import type { Stroke } from '../state';

export type CurveKind = 'hypo' | 'epi' | 'rose' | 'harmonic' | 'nested';
export type Term = { amplitude: number; frequency: number; phase: number };
export type Curve = {
  kind: CurveKind; R: number; r: number; d: number; k: number; phase: number;
  direction: 1 | -1; turns: number; terms: Term[];
};
export type BrushKind = 'archival' | 'thread' | 'foil' | 'luminous' | 'pigment' | 'particle';
export type Blend = 'normal' | 'multiply' | 'screen';
export type Appearance = {
  brush: BrushKind; palette: string[]; width: number; opacity: number; blend: Blend;
  texture: number; cycles: number; seed: number;
};
export type MotionKind = 'still' | 'breathe' | 'drift' | 'morph' | 'echo' | 'bloom';
export type Motion = { kind: MotionKind; amplitude: number; period: number; phase: number; echoes: number };
export type Transform = { x: number; y: number; scale: number; rotation: number };
export type ArtObject = {
  id: string; name: string; type: 'curve' | 'text' | 'classic'; visible: boolean; locked: boolean;
  transform: Transform; appearance: Appearance; motion: Motion; geometry: Curve;
  text: { content: string; font: 'Instrument Serif' | 'DM Sans' | 'IBM Plex Mono'; size: number; weight: number; align: 'start' | 'middle' | 'end' };
  classic?: Stroke;
};
export type Paper = { kind: 'cotton' | 'washi' | 'riso' | 'screen' | 'emboss'; color: string; grain: number; registration: number; density: number; light: number };
export type Artwork = {
  schemaVersion: 2; id: string; title: string; statement: string; seed: number;
  artboard: { width: number; height: number }; paper: Paper;
  timeline: { time: number; duration: number; speed: number; loop: boolean };
  objects: ArtObject[];
};
export const clone = <T>(value: T): T => structuredClone(value);
export const defaultCurve = (kind: CurveKind = 'hypo'): Curve => ({ kind, R: 120, r: 52, d: 44, k: 5, phase: 0, direction: 1, turns: 12, terms: [{ amplitude: 1, frequency: 1, phase: 0 }, { amplitude: .38, frequency: -5, phase: .3 }, { amplitude: .16, frequency: 11, phase: 0 }] });
export const defaultAppearance = (): Appearance => ({ brush: 'archival', palette: ['#244f63', '#a95645', '#a68d58'], width: .8, opacity: 1, blend: 'normal', texture: .35, cycles: 1, seed: 17 });
export const defaultMotion = (): Motion => ({ kind: 'still', amplitude: .18, period: 12, phase: 0, echoes: 4 });
export function object(id: string, geometry = defaultCurve()): ArtObject {
  return { id, name: 'Untitled orbit', type: 'curve', visible: true, locked: false, geometry,
    transform: { x: 500, y: 500, scale: 1, rotation: 0 }, appearance: defaultAppearance(), motion: defaultMotion(),
    text: { content: 'A STUDY IN CIRCULAR MOTION', font: 'IBM Plex Mono', size: 14, weight: 400, align: 'middle' } };
}
