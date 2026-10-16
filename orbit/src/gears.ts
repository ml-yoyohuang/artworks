import { toothPath, MODULE, type Geometry, radii } from './geometry';
import { HOLES } from './catalog';
export function gearMarkup(teeth: number, color: string, id: string, interactive = false, selected = 4): string {
  const r = teeth * MODULE / 2;
  return `<defs>
    <linearGradient id="plastic-${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${color}" stop-opacity=".13"/><stop offset=".47" stop-color="${color}" stop-opacity=".30"/><stop offset=".51" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="${color}" stop-opacity=".42"/></linearGradient>
  </defs>
  <path d="${toothPath(teeth, r)}" fill="url(#plastic-${id})" stroke="${color}" stroke-width="1.25"/>
  <circle r="${r - 6}" fill="none" stroke="white" stroke-opacity=".85" stroke-width="1.7"/>
  <circle r="${r - 10}" fill="none" stroke="${color}" stroke-opacity=".5" stroke-width=".8"/>
  <circle r="${r * .12}" fill="none" stroke="${color}" stroke-width=".8"/>
  <path d="M-5 0H5M0 -5V5" stroke="${color}" stroke-width=".7"/>
  <text x="${-r * .48}" y="${-r * .12}" fill="#45696a" font-size="${r * .17}" font-family="monospace" text-anchor="middle">${teeth}</text>
  <text x="0" y="${r * .48}" fill="#45696a" font-size="${r * .085}" font-family="monospace" text-anchor="middle" letter-spacing="2">ORBIT</text>
  ${HOLES.map((hole, i) => `<g ${interactive ? `data-hole="${i}" class="gear-hole"` : ''}>
    <circle cx="${r * hole}" r="${interactive ? 8 : 4}" fill="${i === selected ? '#f9f8ef' : '#f7f6ee'}" fill-opacity=".82" stroke="${color}" stroke-width="1"/>
    ${interactive ? `<circle cx="${r * hole}" r="13" fill="transparent"/><text x="${r * hole}" y="-14" text-anchor="middle" font-family="monospace" font-size="9" fill="#36565b">${i + 1}</text>` : ''}
  </g>`).join('')}`;
}
export function ringMarkup(g: Geometry): string {
  const { R } = radii(g), outer = R + 30;
  const outerPath = `M${outer},0 A${outer},${outer} 0 1 0 ${-outer},0 A${outer},${outer} 0 1 0 ${outer},0Z`;
  return `<defs><linearGradient id="ring-plastic" x2="1" y2="1"><stop stop-color="#dce9db" stop-opacity=".42"/><stop offset=".45" stop-color="#edf4e7" stop-opacity=".1"/><stop offset="1" stop-color="#a6c4ac" stop-opacity=".30"/></linearGradient></defs>
    <path d="${outerPath} ${toothPath(g.ring, R, true)}" fill-rule="evenodd" fill="url(#ring-plastic)" stroke="#94ad99" stroke-opacity=".72" stroke-width="1"/>
    <circle r="${outer - 3}" fill="none" stroke="white" stroke-width="2" stroke-opacity=".85"/>
    <circle r="${R + 8}" fill="none" stroke="#93a98f" stroke-width=".7" stroke-opacity=".7"/>
    ${Array.from({ length: 60 }, (_, i) => {
      const a = i * Math.PI / 30, inner = R + (i % 5 === 0 ? 12 : 17), out = R + 22;
      return `<path d="M${inner * Math.cos(a)} ${inner * Math.sin(a)}L${out * Math.cos(a)} ${out * Math.sin(a)}" stroke="#70816a" stroke-opacity=".55" stroke-width=".7"/>`;
    }).join('')}
    <text x="0" y="${-R - 12}" fill="#586953" text-anchor="middle" font-size="8" letter-spacing="2" font-family="monospace">ORBIT · ${g.ring}T</text>`;
}
