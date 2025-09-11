// Minimal WebGL renderer: draws a growing line of the multiplier curve.

const vsSource = `
attribute vec2 a_pos;
uniform vec2 u_scale;
void main() {
  gl_Position = vec4(a_pos * u_scale, 0.0, 1.0);
}
`;

const fsSource = `
precision mediump float;
uniform vec3 u_color;
void main() {
  gl_FragColor = vec4(u_color, 1.0);
}
`;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { antialias: true });
    if (!this.gl) throw new Error('WebGL not supported');
    this._init();
    this.points = []; // [{x,y}]
    this.yMax = 2; // dynamic scaling
  }

  _init() {
    const { gl } = this;
    // Resize to CSS size
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    this.canvas.width = w; this.canvas.height = h;
    gl.viewport(0, 0, w, h);

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource); gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource); gl.compileShader(fs);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    this.prog = prog;
    this.a_pos = gl.getAttribLocation(prog, 'a_pos');
    this.u_scale = gl.getUniformLocation(prog, 'u_scale');
    this.u_color = gl.getUniformLocation(prog, 'u_color');
    this.buf = gl.createBuffer();
  }

  reset(maxY = 2) {
    this.points.length = 0;
    this.yMax = Math.max(1.5, maxY);
  }

  addPoint(x01, mult, crashAt) {
    // map x in [0,1] to [-1,1]
    const x = x01 * 2 - 1;
    // map multiplier to y using ln scale so large values fit
    const yNorm = Math.log(mult) / Math.log(Math.max(1.0001, Math.max(2, crashAt)));
    const y = yNorm * 1.8 - 0.9; // keep within view
    this.points.push({ x, y });
  }

  draw(currentState = 'running') {
    const { gl } = this;
    gl.clearColor(0.04, 0.06, 0.12, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (this.points.length < 2) return;

    const data = new Float32Array(this.points.length * 2);
    for (let i = 0; i < this.points.length; i++) {
      data[i * 2 + 0] = this.points[i].x;
      data[i * 2 + 1] = this.points[i].y;
    }

    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.a_pos);
    gl.vertexAttribPointer(this.a_pos, 2, gl.FLOAT, false, 0, 0);

    // scale is identity; positions already NDC. Keep uniform for future effects
    gl.uniform2f(this.u_scale, 1.0, 1.0);
    const color = currentState === 'crashed' ? [1.0, 0.36, 0.48] : [0.43, 0.91, 1.0];
    gl.uniform3fv(this.u_color, color);
    gl.drawArrays(gl.LINE_STRIP, 0, this.points.length);
  }
}

