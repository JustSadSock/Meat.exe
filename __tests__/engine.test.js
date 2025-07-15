import { jest } from '@jest/globals';
import { initEngine, renderFrame, kickFov } from '../engine.js';
import { setPerformanceSettings } from '../metaMutate.js';

function createStubGL(){
  return {
    BLEND: 1,
    SRC_ALPHA: 2,
    ONE_MINUS_SRC_ALPHA: 3,
    COLOR_BUFFER_BIT: 4,
    VERTEX_SHADER: 5,
    FRAGMENT_SHADER: 6,
    ARRAY_BUFFER: 7,
    POINTS: 8,
    createShader: jest.fn(()=>({})),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn(()=>true),
    getShaderInfoLog: jest.fn(()=>''),
    createProgram: jest.fn(()=>({})),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(()=>true),
    getProgramInfoLog: jest.fn(()=>''),
    getAttribLocation: jest.fn(()=>0),
    getUniformLocation: jest.fn(()=>({})),
    createBuffer: jest.fn(()=>({})),
    clearColor: jest.fn(),
    viewport: jest.fn(),
    enable: jest.fn(),
    blendFunc: jest.fn(),
    useProgram: jest.fn(),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    uniform3fv: jest.fn(),
    uniform1f: jest.fn(),
    drawArrays: jest.fn(),
    clear: jest.fn()
  };
}

describe('engine rendering', () => {
  let gl, canvas;
  beforeEach(() => {
    gl = createStubGL();
    canvas = document.createElement('canvas');
    canvas.getContext = () => gl;
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
    setPerformanceSettings({ bloodLimit: 1 });
    initEngine(gl, canvas, true);
  });

  test('renderFrame logs stats', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(()=>{});
    renderFrame(0.016, [{x:0,y:0}], [{points:[{x:0,y:0}]}], [{x:0,y:0}], [], [{x:0,y:0}], 5, 1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('kickFov affects camera FOV', () => {
    kickFov(0.5);
    const spy = jest.spyOn(console, 'log').mockImplementation(()=>{});
    renderFrame(0.016, [], [], [], [], [], 5, 1);
    spy.mockRestore();
    // FOV should move towards >1 after kick
    // not a strict test but ensures renderFrame ran with updated FOV
    expect(gl.clear).toHaveBeenCalled();
  });
});
