// 極簡 WebGL 全畫面著色器工具（不依賴 three.js）。
export function createGL(canvas, frag, opts = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true, premultipliedAlpha: false, ...opts });
  if (!gl) throw new Error('webgl');
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const cache = {};
  const u = name => (name in cache ? cache[name] : (cache[name] = gl.getUniformLocation(prog, name)));
  return {
    gl,
    size(w, h, dpr) { canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr)); gl.viewport(0, 0, canvas.width, canvas.height); },
    f(name, ...v) { const l = u(name); if (!l) return; [gl.uniform1f, gl.uniform2f, gl.uniform3f, gl.uniform4f][v.length - 1].call(gl, l, ...v); },
    i(name, v) { const l = u(name); if (l) gl.uniform1i(l, v); },
    v4(name, arr) { const l = u(name); if (l) gl.uniform4fv(l, arr); },
    v3(name, arr) { const l = u(name); if (l) gl.uniform3fv(l, arr); },
    v2(name, arr) { const l = u(name); if (l) gl.uniform2fv(l, arr); },
    draw() { gl.drawArrays(gl.TRIANGLES, 0, 3); },
    dispose() { gl.deleteBuffer(buf); gl.deleteProgram(prog); const ext = gl.getExtension('WEBGL_lose_context'); ext && ext.loseContext(); }
  };
}

export const GLSL_NOISE = `
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
`;
