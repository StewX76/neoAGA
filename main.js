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

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resize();

    window.addEventListener(
        "resize",
        resize
    );

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

    const shader =
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
        vec4<f32>(
            pos[index],
            0.0,
            1.0
        );

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
// Scene — continuous organic surface
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

// ---------------------------------------------
// Copper Dream Layer — scanlines, golden sweeps,
// raster glow, finom overlay minden jeleneten
// ---------------------------------------------

fn copperLayer(
    uv      : vec2<f32>,
    t       : f32,
    fog     : f32
) -> vec3<f32>
{
    // alap scanline moduláció (Y irány)
    let scanFreq  = 480.0;
    let scanPhase =
        uv.y * scanFreq - t * 24.0;

    let scan =
        0.5 + 0.5 * sin(scanPhase);

    let scanMask =
        smoothstep(0.2, 1.0, abs(uv.y)) * 0.6;

    // arany sweepek — lassan felfelé vándorló sávok
    let sweepFreq  = 6.0;
    let sweepPhase =
        uv.y * sweepFreq + t * 0.6;

    let sweepBand =
        smoothstep(0.3, 0.95, sin(sweepPhase));

    let sweepGlow =
        pow(sweepBand, 4.0);

    let copperGold =
        vec3<f32>(0.85, 0.72, 0.40);

    let copperBronze =
        vec3<f32>(0.40, 0.26, 0.14);

    let baseCopper =
        mix(copperBronze, copperGold, 0.65);

    var layer =
        baseCopper * (scan * 0.12 * scanMask);

    layer =
        layer + copperGold * sweepGlow * 0.18;

    // raster glow — finom horizontális fénycsíkok
    let rasterFreq  = 18.0;
    let rasterPhase =
        uv.y * rasterFreq + t * 1.8;

    let rasterBand =
        smoothstep(0.4, 0.98, sin(rasterPhase));

    let rasterGlow =
        pow(rasterBand, 3.0);

    layer =
        layer + copperGold * rasterGlow * 0.12;

    // foggal súlyozva — távolban erősebb, közelben gyengébb
    let intensity =
        0.35 * (1.0 - fog);

    return layer * intensity;
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

    if (!hit)
    {
        let depth =
            max(0.0, 1.0 - length(uv));

        var bg =
            vec3<f32>(
                0.02,
                0.05 + depth * 0.15,
                0.08 + depth * 0.25
            );

        let fogBg =
            exp(-total * 0.035);

        let copper =
            copperLayer(uv, t, fogBg);

        bg = bg + copper;

        return vec4<f32>(bg, 1.0);
    }

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

    var color =
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

    let fog =
        exp(-total * 0.035);

    let fogColor =
        vec3<f32>(0.02, 0.08, 0.10);

    color =
        fogColor * (1.0 - fog) + color * fog;

    // Copper Dream overlay a tunnelre is
    let copper =
        copperLayer(uv, t, fog);

    color =
        color + copper;

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

    shader.getCompilationInfo()
        .then(info => {
            console.log(info);
        });

    const bindGroupLayout =
        device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility:
                    GPUShaderStage.FRAGMENT,
                buffer: {}
            }]
        });

    const pipelineLayout =
        device.createPipelineLayout({
            bindGroupLayouts: [
                bindGroupLayout
            ]
        });

    const pipeline =
        device.createRenderPipeline({
            layout:
                pipelineLayout,

            vertex: {
                module: shader,
                entryPoint: "vs_main"
            },

            fragment: {
                module: shader,
                entryPoint: "fs_main",
                targets: [
                    { format }
                ]
            },

            primitive: {
                topology:
                    "triangle-list"
            }
        });

    const bindGroup =
        device.createBindGroup({
            layout:
                bindGroupLayout,

            entries: [{
                binding: 0,
                resource: {
                    buffer:
                        uniformBuffer
                }
            }]
        });

    function frame(ms)
    {
        const time =
            ms * 0.001;

        const aspect =
            canvas.width / canvas.height;

        device.queue.writeBuffer(
            uniformBuffer,
            0,
            new Float32Array([
                time,
                aspect,
                0,
                0
            ])
        );

        const encoder =
            device.createCommandEncoder();

        const pass =
            encoder.beginRenderPass({

                colorAttachments: [{

                    view:
                        context
                        .getCurrentTexture()
                        .createView(),

                    clearValue: {
                        r: 0,
                        g: 0,
                        b: 0,
                        a: 1
                    },

                    loadOp: "clear",
                    storeOp: "store"
                }]
            });

        pass.setPipeline(
            pipeline
        );

        pass.setBindGroup(
            0,
            bindGroup
        );

        pass.draw(3);

        pass.end();

        device.queue.submit([
            encoder.finish()
        ]);

        requestAnimationFrame(
            frame
        );
    }

    requestAnimationFrame(
        frame
    );
}

init();
