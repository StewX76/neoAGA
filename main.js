const canvas = document.getElementById("gfx");

async function init() {

    if (!navigator.gpu) {
        document.body.innerHTML =
            "<h1>WebGPU not supported</h1>";
        return;
    }

    const adapter =
        await navigator.gpu.requestAdapter();

    const device =
        await adapter.requestDevice();

    const context =
        canvas.getContext("webgpu");

    const format =
        navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device,
        format,
        alphaMode: "opaque"
    });

    // time, aspect, pad0, pad1 — 16 bytes
    const uniformBuffer =
        device.createBuffer({
            size: 16,
            usage:
                GPUBufferUsage.UNIFORM |
                GPUBufferUsage.COPY_DST
        });

    // -------------------------------------------------
    // SCENE SHADER — tunnel raymarch + Copper Dream layer
    // (bands / scanlines / echoes are screen-space, so
    // they live here; only the feedback trail needs a
    // second pass)
    // -------------------------------------------------

    const sceneShader =
        device.createShaderModule({
code: `

struct Uniforms {
    time   : f32,
    aspect : f32,
    pad0   : f32,
    pad1   : f32
};

@group(0) @binding(0)
var<uniform> uniforms : Uniforms;

struct VSOut {
    @builtin(position)
    position : vec4<f32>,

    @location(0)
    uv : vec2<f32>
};

@vertex
fn vs_main(
    @builtin(vertex_index)
    index : u32
) -> VSOut
{
    var pos =
        array<vec2<f32>,3>(
            vec2<f32>(-1.0,-3.0),
            vec2<f32>(-1.0, 1.0),
            vec2<f32>( 3.0, 1.0)
        );

    var out : VSOut;

    out.position =
        vec4<f32>(pos[index], 0.0, 1.0);

    out.uv =
        pos[index];

    return out;
}

// ---------------------------------------------
// Hash / Noise / FBM — organic surface irregularity
// ---------------------------------------------

fn hash21(p : vec2<f32>) -> f32
{
    var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn noise2(p : vec2<f32>) -> f32
{
    let i = floor(p);
    let f = fract(p);

    let a = hash21(i);
    let b = hash21(i + vec2<f32>(1.0, 0.0));
    let c = hash21(i + vec2<f32>(0.0, 1.0));
    let d = hash21(i + vec2<f32>(1.0, 1.0));

    let u = f * f * (3.0 - 2.0 * f);

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn fbm2(p0 : vec2<f32>) -> f32
{
    var p = p0;
    var value = 0.0;
    var amp = 0.5;

    for (var i : i32 = 0; i < 4; i = i + 1)
    {
        value = value + amp * noise2(p);
        amp = amp * 0.5;
        p = p * 2.0;
    }

    return value;
}

// ---------------------------------------------
// Tunnel path — camera and geometry share this
// ---------------------------------------------

fn tunnelCenter(
    z : f32
) -> vec2<f32>
{
    return vec2<f32>(
        sin(z * 0.20) * 0.9 + sin(z * 0.073) * 0.35,
        cos(z * 0.14) * 0.7 + cos(z * 0.051) * 0.30
    );
}

// ---------------------------------------------
// Scene — breathing radius + spiral ribs +
// vertebrae bulges + organic noise, folded
// into a single continuous surface
// ---------------------------------------------

const BASE_RADIUS    = 1.45;
const SPIRAL_TWIST   = 0.85;
const RIB_DEPTH      = 0.06;
const VERT_SPACING   = 3.2;
const VERT_BULGE     = 0.22;
const ORGANIC_AMOUNT = 0.045;

fn mapScene(
    p0 : vec3<f32>
) -> f32
{
    var p = p0;

    let center =
        tunnelCenter(p.z);

    p.x = p.x - center.x;
    p.y = p.y - center.y;

    let angle =
        atan2(p.y, p.x);

    let distFromCenter =
        length(p.xy);

    var radius =
        BASE_RADIUS +
        0.10 * sin(p.z * 4.0 + uniforms.time * 1.5);

    let spiralPhase =
        p.z * 0.35 + angle * SPIRAL_TWIST;

    let ribWave =
        sin(spiralPhase * 6.2831853);

    let ribGroove =
        smoothstep(0.55, 1.0, ribWave) * RIB_DEPTH;

    radius = radius - ribGroove;

    let vertPhase =
        fract(p.z / VERT_SPACING) - 0.5;

    let vertProfile =
        1.0 - smoothstep(0.0, 0.5, abs(vertPhase) * 2.0);

    radius = radius - vertProfile * VERT_BULGE;

    let organicNoise =
        fbm2(vec2<f32>(angle * 2.5, p.z * 0.6)) - 0.5;

    radius = radius + organicNoise * ORGANIC_AMOUNT;

    return abs(distFromCenter - radius);
}

fn getNormal(
    p : vec3<f32>
) -> vec3<f32>
{
    let e = 0.01;

    let dx =
        mapScene(p + vec3<f32>(e, 0.0, 0.0))
        -
        mapScene(p - vec3<f32>(e, 0.0, 0.0));

    let dy =
        mapScene(p + vec3<f32>(0.0, e, 0.0))
        -
        mapScene(p - vec3<f32>(0.0, e, 0.0));

    let dz =
        mapScene(p + vec3<f32>(0.0, 0.0, e))
        -
        mapScene(p - vec3<f32>(0.0, 0.0, e));

    return normalize(vec3<f32>(dx, dy, dz));
}

fn calcAO(
    p : vec3<f32>,
    n : vec3<f32>
) -> f32
{
    var occ = 0.0;
    var sca = 1.0;

    for (var i : i32 = 0; i < 5; i = i + 1)
    {
        let h =
            0.02 + 0.12 * f32(i) / 4.0;

        let d =
            mapScene(p + n * h);

        occ = occ + (h - d) * sca;
        sca = sca * 0.7;
    }

    return clamp(1.0 - occ * 3.0, 0.0, 1.0);
}

@fragment
fn fs_main(
    input : VSOut
)
-> @location(0)
vec4<f32>
{
    let uv =
        vec2<f32>(
            input.uv.x * uniforms.aspect,
            input.uv.y
        );

    let t =
        uniforms.time;

    const SPEED      = 4.4;
    const LOOK_AHEAD = 4.5;
    const FOCAL      = 1.55;

    let s = t * SPEED;

    let camCenter =
        tunnelCenter(s);

    let ro =
        vec3<f32>(camCenter.x, camCenter.y, s);

    let laZ = s + LOOK_AHEAD;

    let laCenter =
        tunnelCenter(laZ);

    let la =
        vec3<f32>(laCenter.x, laCenter.y, laZ);

    let forward =
        normalize(la - ro);

    let worldUp =
        vec3<f32>(0.0, 1.0, 0.0);

    var right =
        normalize(cross(forward, worldUp));

    var up =
        cross(right, forward);

    let roll =
        sin(s * 0.06) * 0.25;

    let cr = cos(roll);
    let sr = sin(roll);

    let rolledRight =
        right * cr + up * sr;

    let rolledUp =
        up * cr - right * sr;

    let rd =
        normalize(
            forward * FOCAL
            +
            rolledRight * uv.x
            +
            rolledUp * uv.y
        );

    var total = 0.0;
    var hit = false;

    var p =
        vec3<f32>(0.0);

    for (
        var i : i32 = 0;
        i < 90;
        i = i + 1
    )
    {
        p = ro + rd * total;

        let d =
            mapScene(p);

        if (d < 0.0015 * max(total, 1.0))
        {
            hit = true;
            break;
        }

        total =
            total +
            max(d, 0.01);

        if (total > 60.0)
        {
            break;
        }
    }

    var color : vec3<f32>;
    var fog = 0.0;

    if (!hit)
    {
        let depth =
            max(0.0, 1.0 - length(uv));

        color =
            vec3<f32>(
                0.02,
                0.05 + depth * 0.15,
                0.08 + depth * 0.25
            );
    }
    else
    {
        let n =
            getNormal(p);

        let ao =
            calcAO(p, n);

        let lightDir =
            normalize(vec3<f32>(0.6, 0.7, -0.5));

        let diffuse =
            max(dot(n, lightDir), 0.0);

        let bronze =
            vec3<f32>(0.42, 0.28, 0.15);

        let gold =
            vec3<f32>(0.80, 0.66, 0.32);

        let turquoise =
            vec3<f32>(0.15, 0.65, 0.60);

        color =
            bronze + diffuse * gold;

        let pulse =
            0.5 + 0.5 * sin(p.z * 12.0 - t * 12.0);

        let ribGlow =
            pulse * pulse * pulse;

        color =
            color + turquoise * ribGlow * 0.40;

        color =
            color * (0.25 + 0.85 * ao);

        let rim =
            pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

        color =
            color + turquoise * rim * 0.25;

        fog =
            exp(-total * 0.035);

        let fogColor =
            vec3<f32>(0.02, 0.08, 0.10);

        color =
            fogColor * (1.0 - fog) + color * fog;
    }

    let gold =
        vec3<f32>(0.80, 0.66, 0.32);

    let turquoise =
        vec3<f32>(0.15, 0.65, 0.60);

    // --- Copper Dream: moving golden sweep ---
    let bandDir =
        normalize(vec2<f32>(0.4, 1.0));

    let bandCoord =
        dot(uv, bandDir) + t * 0.15;

    let band =
        sin(bandCoord * 3.0) * 0.5 + 0.5;

    let softBand =
        smoothstep(0.35, 1.0, band);

    color =
        color + gold * softBand * 0.05;

    // --- Copper Dream: raster echoes, fading repeats ---
    for (var e : i32 = 1; e < 4; e = e + 1)
    {
        let phase =
            bandCoord * 3.0 + f32(e) * 2.1;

        let echo =
            sin(phase) * 0.5 + 0.5;

        let softEcho =
            smoothstep(0.55, 1.0, echo);

        color =
            color + turquoise * softEcho * (0.025 / f32(e));
    }

    // --- Copper Dream: scanline glow ---
    let scan =
        sin(input.position.y * 0.9 - t * 40.0) * 0.5 + 0.5;

    color =
        color + vec3<f32>(1.0, 0.9, 0.7) * pow(scan, 6.0) * 0.03;

    // --- speed streaks + vignette ---
    let streakAngle =
        atan2(uv.y, uv.x);

    let streak =
        pow(abs(sin(streakAngle * 60.0 - s * 4.0)), 30.0);

    let streakMask =
        smoothstep(0.25, 1.0, length(uv)) * fog;

    color =
        color + vec3<f32>(1.0, 0.95, 0.85) * streak * streakMask * 0.15;

    let vignette =
        1.0 - length(uv) * 0.22;

    color = color * vignette;

    return vec4<f32>(color, 1.0);
}

`
        });

    // -------------------------------------------------
    // COMPOSE SHADER — recursive feedback trail
    // (Design Bible: "Feedback: Recursive Frame Feedback")
    // -------------------------------------------------

    const composeShader =
        device.createShaderModule({
code: `

struct VSOut {
    @builtin(position)
    position : vec4<f32>,

    @location(0)
    uv : vec2<f32>
};

@vertex
fn vs_main(
    @builtin(vertex_index)
    index : u32
) -> VSOut
{
    var pos =
        array<vec2<f32>,3>(
            vec2<f32>(-1.0,-3.0),
            vec2<f32>(-1.0, 1.0),
            vec2<f32>( 3.0, 1.0)
        );

    var out : VSOut;

    out.position =
        vec4<f32>(pos[index], 0.0, 1.0);

    out.uv =
        pos[index];

    return out;
}

@group(0) @binding(0) var samp        : sampler;
@group(0) @binding(1) var newFrameTex : texture_2d<f32>;
@group(0) @binding(2) var feedbackTex : texture_2d<f32>;

struct FSOut {
    @location(0) color    : vec4<f32>,
    @location(1) feedback : vec4<f32>
};

@fragment
fn fs_main(
    input : VSOut
) -> FSOut
{
    let uvTex =
        vec2<f32>(
            input.uv.x * 0.5 + 0.5,
            1.0 - (input.uv.y * 0.5 + 0.5)
        );

    let newC =
        textureSample(newFrameTex, samp, uvTex).rgb;

    // organic drift — slow zoom + rotation so trails
    // swirl instead of freezing into a static ghost
    let center =
        vec2<f32>(0.5, 0.5);

    var duv =
        uvTex - center;

    const ANGLE = 0.006;

    let cs = cos(ANGLE);
    let sn = sin(ANGLE);

    duv =
        vec2<f32>(
            duv.x * cs - duv.y * sn,
            duv.x * sn + duv.y * cs
        ) * 0.992;

    let feedbackUV =
        center + duv;

    let prevC =
        textureSample(feedbackTex, samp, feedbackUV).rgb;

    const DECAY = 0.86;

    var combined =
        newC + prevC * DECAY;

    // soft tonemap keeps the recursive buildup bounded
    combined =
        combined / (1.0 + combined);

    var out : FSOut;

    out.color =
        vec4<f32>(combined, 1.0);

    out.feedback =
        vec4<f32>(combined, 1.0);

    return out;
}

`
        });

    // -------------------------------------------------
    // Pipelines
    // -------------------------------------------------

    const sceneBindGroupLayout =
        device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {}
            }]
        });

    const scenePipeline =
        device.createRenderPipeline({
            layout:
                device.createPipelineLayout({
                    bindGroupLayouts: [sceneBindGroupLayout]
                }),

            vertex: {
                module: sceneShader,
                entryPoint: "vs_main"
            },

            fragment: {
                module: sceneShader,
                entryPoint: "fs_main",
                targets: [{ format }]
            },

            primitive: { topology: "triangle-list" }
        });

    const sceneBindGroup =
        device.createBindGroup({
            layout: sceneBindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: uniformBuffer }
            }]
        });

    const composeBindGroupLayout =
        device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: "filtering" }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "float" }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "float" }
                }
            ]
        });

    const composePipeline =
        device.createRenderPipeline({
            layout:
                device.createPipelineLayout({
                    bindGroupLayouts: [composeBindGroupLayout]
                }),

            vertex: {
                module: composeShader,
                entryPoint: "vs_main"
            },

            fragment: {
                module: composeShader,
                entryPoint: "fs_main",
                targets: [{ format }, { format }]
            },

            primitive: { topology: "triangle-list" }
        });

    const sampler =
        device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge"
        });

    // -------------------------------------------------
    // Offscreen resources — recreated on resize
    // -------------------------------------------------

    let sceneTex, texA, texB;
    let composeBindGroups = [null, null];
    let frameIndex = 0;

    function makeTex() {
        return device.createTexture({
            size: [canvas.width, canvas.height],
            format,
            usage:
                GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.TEXTURE_BINDING
        });
    }

    function createOffscreenResources() {
        if (canvas.width === 0 || canvas.height === 0) return;

        sceneTex = makeTex();
        texA = makeTex();
        texB = makeTex();

        const sceneView = sceneTex.createView();

        composeBindGroups[0] =
            device.createBindGroup({
                layout: composeBindGroupLayout,
                entries: [
                    { binding: 0, resource: sampler },
                    { binding: 1, resource: sceneView },
                    { binding: 2, resource: texA.createView() }
                ]
            });

        composeBindGroups[1] =
            device.createBindGroup({
                layout: composeBindGroupLayout,
                entries: [
                    { binding: 0, resource: sampler },
                    { binding: 1, resource: sceneView },
                    { binding: 2, resource: texB.createView() }
                ]
            });

        frameIndex = 0;
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        createOffscreenResources();
    }

    resize();

    window.addEventListener("resize", resize);

    // -------------------------------------------------
    // Frame loop
    // -------------------------------------------------

    function frame(ms) {
        const time = ms * 0.001;
        const aspect = canvas.width / canvas.height;

        device.queue.writeBuffer(
            uniformBuffer,
            0,
            new Float32Array([time, aspect, 0, 0])
        );

        const encoder = device.createCommandEncoder();

        // Pass 1 — render scene into offscreen texture
        const scenePass =
            encoder.beginRenderPass({
                colorAttachments: [{
                    view: sceneTex.createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store"
                }]
            });

        scenePass.setPipeline(scenePipeline);
        scenePass.setBindGroup(0, sceneBindGroup);
        scenePass.draw(3);
        scenePass.end();

        // Pass 2 — composite with decayed feedback trail,
        // write to canvas AND to the next feedback texture
        const readIdx = frameIndex % 2;
        const writeTex = readIdx === 0 ? texB : texA;

        const composePass =
            encoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: context.getCurrentTexture().createView(),
                        clearValue: { r: 0, g: 0, b: 0, a: 1 },
                        loadOp: "clear",
                        storeOp: "store"
                    },
                    {
                        view: writeTex.createView(),
                        clearValue: { r: 0, g: 0, b: 0, a: 1 },
                        loadOp: "clear",
                        storeOp: "store"
                    }
                ]
            });

        composePass.setPipeline(composePipeline);
        composePass.setBindGroup(0, composeBindGroups[readIdx]);
        composePass.draw(3);
        composePass.end();

        device.queue.submit([encoder.finish()]);

        frameIndex = frameIndex + 1;

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

init();
