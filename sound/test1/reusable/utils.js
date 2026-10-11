export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const noise=(n,seed=4172)=>{const x=Math.sin(n*127.1+seed*13.13)*43758.5453;return x-Math.floor(x)};
