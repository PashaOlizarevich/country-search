import type { Country } from '../models/country.js';
import { createFlag, createIcon, element } from './dom.js';

interface Resources {
  program: WebGLProgram;
  vertices: WebGLBuffer;
  indices: WebGLBuffer;
  texture: WebGLTexture | null;
  position: number;
  time: WebGLUniformLocation;
  scale: WebGLUniformLocation;
  sampler: WebGLUniformLocation;
  count: number;
}

const vertexSource = `
attribute vec2 aPosition;
uniform float uTime;
uniform vec2 uScale;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  float s = (aPosition.x + 1.0) * 0.5;
  float y = aPosition.y;
  float phase = 6.0 * s - uTime * 1.6 + y * 2.4;
  float secondary = 14.0 * s - uTime * 2.4 - y * 3.4;
  float amplitude = 0.22 * s;
  float z = amplitude * sin(phase) + 0.045 * s * sin(secondary);
  float dzdx = 0.5 * (0.22 * sin(phase) + amplitude * 6.0 * cos(phase)
    + 0.045 * sin(secondary) + 0.63 * s * cos(secondary));
  float dzdy = amplitude * 2.4 * cos(phase) - 0.153 * s * cos(secondary);
  vec2 projected = vec2(aPosition.x - z * 0.16,
    y - 0.025 * s * s + 0.012 * s * sin(phase) + z * 0.16);
  gl_Position = vec4(projected * uScale, z * 0.1, 1.0);
  vUv = vec2(s, (y + 1.0) * 0.5);
  vNormal = normalize(vec3(-dzdx, -dzdy, 1.0));
}
`;

const fragmentSource = `
precision mediump float;
uniform sampler2D uTexture;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec4 flag = texture2D(uTexture, vUv);
  vec3 normal = normalize(vNormal);
  vec3 light = normalize(vec3(-0.7, 0.7, 1.0));
  float diffuse = max(dot(normal, light), 0.0);
  float fill = max(dot(normal, normalize(vec3(0.6, -0.2, 1.0))), 0.0);
  float sheen = pow(max(dot(normal, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 24.0);
  float weave = 0.993 + 0.007 * sin(vUv.x * 800.0) * sin(vUv.y * 600.0);
  vec3 color = flag.rgb * (0.44 + 0.58 * diffuse + 0.10 * fill) * weave;
  gl_FragColor = vec4(color + 0.055 * sheen, flag.a);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create flag shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error('Unable to compile flag shader');
  }
  return shader;
}

function createResources(gl: WebGLRenderingContext): Resources {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  let fragment: WebGLShader;
  try {
    fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  } catch (error) {
    gl.deleteShader(vertex);
    throw error;
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    throw new Error('Unable to create flag program');
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.detachShader(program, vertex);
  gl.detachShader(program, fragment);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    throw new Error('Unable to link flag program');
  }
  const vertices = gl.createBuffer();
  const indices = gl.createBuffer();
  const time = gl.getUniformLocation(program, 'uTime');
  const scale = gl.getUniformLocation(program, 'uScale');
  const sampler = gl.getUniformLocation(program, 'uTexture');
  const position = gl.getAttribLocation(program, 'aPosition');
  if (!vertices || !indices || !time || !scale || !sampler || position < 0) {
    gl.deleteBuffer(vertices);
    gl.deleteBuffer(indices);
    gl.deleteProgram(program);
    throw new Error('Unable to allocate flag resources');
  }

  const columns = 64;
  const rows = 32;
  const points: number[] = [];
  const triangles: number[] = [];
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      points.push((column / columns) * 2 - 1, (row / rows) * 2 - 1);
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const start = row * (columns + 1) + column;
      const next = start + columns + 1;
      triangles.push(start, start + 1, next, start + 1, next + 1, next);
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW);
  return {
    program,
    vertices,
    indices,
    texture: null,
    position,
    time,
    scale,
    sampler,
    count: triangles.length,
  };
}

/** Decorative scene only: the country and its accessible caption stay outside WebGL. */
export function createFlagScene(initialCountry: Country) {
  const root = element('figure', 'flag-preview');
  const stage = element('div', 'flag-image flag-stage');
  const canvas = element('canvas', 'flag-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  let fallback = createFlag(initialCountry.flag);
  fallback.classList.add('flag-static');
  const caption = element('figcaption', 'flag-caption');
  const control = element('button', 'scene-toggle');
  control.type = 'button';
  stage.append(canvas, fallback);
  root.append(stage, caption);

  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let country = initialCountry;
  let example = true;
  let currentUrl: string | null | undefined;
  let gl: WebGLRenderingContext | null = null;
  let resources: Resources | null = null;
  let ready = false;
  let textureRatio = 1.5;
  let request = 0;
  let pendingImage: HTMLImageElement | null = null;
  let frame = 0;
  let elapsed = 0;
  let previousTime = 0;
  let userPaused = motion.matches;
  let externallyPaused = false;
  let visible = false;
  let lost = false;
  let destroyed = false;

  function cancelFrame(): void {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }

  function canAnimate(): boolean {
    return (
      !destroyed &&
      !lost &&
      ready &&
      !userPaused &&
      !externallyPaused &&
      visible &&
      !document.hidden
    );
  }

  function present(): void {
    canvas.hidden = !ready;
    fallback.hidden = ready;
    const label = !ready
      ? 'Статичный флаг'
      : userPaused
        ? 'Включить анимацию'
        : 'Остановить анимацию';
    control.disabled = !ready;
    control.setAttribute('aria-label', label);
    control.setAttribute('aria-pressed', String(userPaused));
    control.replaceChildren(
      createIcon(userPaused || !ready ? 'play' : 'pause'),
      element('span', 'scene-toggle-label', label),
    );
    caption.textContent = example
      ? `Визуальный пример · ${country.name === 'Japan' ? 'Япония' : country.name}`
      : `Предпросмотр · ${country.name}`;
    root.dataset.mode = !ready ? 'static' : canAnimate() ? 'running' : 'paused';
  }

  function draw(): void {
    if (!gl || !resources || !ready || lost || destroyed || !root.isConnected) return;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const bufferWidth = Math.max(1, Math.round(width * dpr));
    const bufferHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
    }
    const ratio = width / height;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(resources.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, resources.vertices);
    gl.enableVertexAttribArray(resources.position);
    gl.vertexAttribPointer(resources.position, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, resources.indices);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, resources.texture);
    gl.uniform1i(resources.sampler, 0);
    gl.uniform1f(resources.time, elapsed);
    // Leave room for the freely moving edge, preserving the source image ratio.
    gl.uniform2f(
      resources.scale,
      0.92 * Math.min(1, textureRatio / ratio),
      0.92 * Math.min(1, ratio / textureRatio),
    );
    gl.drawElements(gl.TRIANGLES, resources.count, gl.UNSIGNED_SHORT, 0);
  }

  function tick(now: number): void {
    frame = 0;
    if (!canAnimate()) {
      previousTime = 0;
      return;
    }
    if (previousTime) elapsed += Math.min((now - previousTime) / 1000, 0.05);
    previousTime = now;
    draw();
    frame = requestAnimationFrame(tick);
  }

  function syncAnimation(): void {
    if (destroyed) return;
    present();
    if (canAnimate()) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else {
      cancelFrame();
      if (visible && !document.hidden) draw();
    }
  }

  function cancelImage(): void {
    request++;
    if (!pendingImage) return;
    pendingImage.onload = null;
    pendingImage.onerror = null;
    pendingImage.removeAttribute('src');
    pendingImage = null;
  }

  function releaseTexture(): void {
    if (resources) {
      gl?.deleteTexture(resources.texture);
      resources.texture = null;
    }
    ready = false;
  }

  function releaseResources(): void {
    releaseTexture();
    if (gl && resources) {
      gl.deleteBuffer(resources.vertices);
      gl.deleteBuffer(resources.indices);
      gl.deleteProgram(resources.program);
    }
    resources = null;
  }

  function loadTexture(): void {
    cancelImage();
    cancelFrame();
    releaseTexture();
    present();
    const context = gl;
    const currentResources = resources;
    const url = currentUrl;
    if (!url || !context || !currentResources || lost || destroyed) return;
    const image = new Image();
    const currentRequest = request;
    image.crossOrigin = 'anonymous';
    pendingImage = image;
    const isCurrent = (): boolean =>
      !destroyed && !lost && currentRequest === request && resources === currentResources;
    const finish = (): void => {
      pendingImage = null;
      image.onload = null;
      image.onerror = null;
    };
    image.onload = () => {
      if (!isCurrent()) return;
      finish();
      const texture = context.createTexture();
      try {
        const maxSize = Number(context.getParameter(context.MAX_TEXTURE_SIZE));
        if (
          !texture ||
          !image.naturalWidth ||
          !image.naturalHeight ||
          image.naturalWidth > maxSize ||
          image.naturalHeight > maxSize
        ) {
          throw new Error('Unsupported flag texture');
        }
        context.bindTexture(context.TEXTURE_2D, texture);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
        context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, 1);
        context.texImage2D(
          context.TEXTURE_2D,
          0,
          context.RGBA,
          context.RGBA,
          context.UNSIGNED_BYTE,
          image,
        );
        if (context.getError() !== context.NO_ERROR)
          throw new Error('Unable to upload flag texture');
        currentResources.texture = texture;
        textureRatio = image.naturalWidth / image.naturalHeight;
        ready = true;
        draw();
      } catch {
        context.deleteTexture(texture);
        ready = false;
      }
      syncAnimation();
    };
    image.onerror = () => {
      if (!isCurrent()) return;
      finish();
      syncAnimation();
    };
    image.src = url;
  }

  function initialize(): void {
    try {
      gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
      });
      if (gl) resources = createResources(gl);
    } catch {
      releaseResources();
    }
  }

  function setCountry(nextCountry: Country, isExample = false): void {
    if (destroyed) return;
    country = nextCountry;
    example = isExample;
    const url = nextCountry.flag?.url ?? null;
    if (currentUrl === url) {
      const image = fallback.querySelector('img');
      if (image && nextCountry.flag) image.alt = nextCountry.flag.alt;
      present();
      return;
    }
    currentUrl = url;
    const replacement = createFlag(nextCountry.flag);
    replacement.classList.add('flag-static');
    fallback.replaceWith(replacement);
    fallback = replacement;
    loadTexture();
  }

  control.addEventListener(
    'click',
    () => {
      userPaused = !userPaused;
      syncAnimation();
    },
    options,
  );
  document.addEventListener('visibilitychange', syncAnimation, options);
  motion.addEventListener(
    'change',
    () => {
      userPaused = motion.matches;
      syncAnimation();
    },
    options,
  );
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      lost = true;
      ready = false;
      cancelImage();
      cancelFrame();
      // Lost contexts invalidate the handles; restoration allocates a fresh set.
      resources = null;
      present();
    },
    options,
  );
  canvas.addEventListener(
    'webglcontextrestored',
    () => {
      if (destroyed) return;
      lost = false;
      initialize();
      loadTexture();
    },
    options,
  );
  window.addEventListener('resize', draw, options);
  const resize = new ResizeObserver(draw);
  resize.observe(stage);
  const intersection = new IntersectionObserver((entries) => {
    if (destroyed) return;
    visible = entries[0]?.isIntersecting ?? false;
    syncAnimation();
  });
  intersection.observe(stage);
  initialize();
  setCountry(initialCountry, true);

  return {
    root,
    control,
    setCountry,
    setPaused(paused: boolean): void {
      externallyPaused = paused;
      syncAnimation();
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      cancelFrame();
      cancelImage();
      resize.disconnect();
      intersection.disconnect();
      listeners.abort();
      releaseResources();
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      gl = null;
      root.remove();
      control.remove();
    },
  };
}
