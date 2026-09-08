const canvas = document.getElementById("gfx");

async function init() {

    if (!navigator.gpu) {
        document.body.innerHTML =
            "<h1>WebGPU not supported</h1>";
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    const format = navigator.gpu.getPreferredCanvasFormat();

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    context.configure({
        device,
        format,
        alphaMode: "opaque"
    });

    // több uniform: time + tunnel param + camera
    const uniformBuffer =
        device.createBuffer({
            size: 4 * 16,
            usage:
                GPUBufferUsage.UNIFORM |
                GPUBufferUsage.COPY_DST
        });

    const shader =
        device.createShaderModule({
code: `

struct Uniforms {
    time : f32,
    aspect : f32,
    pad0 : f32,
    pad1 : f32,
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

    // aspect korrekció
    out.uv =
        vec2<f32>(
            pos[index].x * uniforms.aspect,
            pos[index].y
        );

    return out;
}

// organikusabb középvonal – zaj + spirál
fn tunnelCenter(z : f32) -> vec2<f32>
{
    let base =
        vec2<f32>(
            sin(z * 0.18),
            cos(z * 0.21)
        );

    let swirl =
        vec2<f32>(
            sin(z * 0.05 + uniforms.time * 0.3),
            cos(z * 0.07 + uniforms.time * 0.2)
        );

    return
        0.9 * base +
        0.4 * swirl;
}

// egyszerű noise helper
fn hash(p : vec2<f32>) -> f32
{
    let h =
        dot(p, vec2<f32>(127.1, 311.7));
    return fract(sin(h) * 43758.5453);
}

fn noise(p : vec2<f32>) -> f32
{
    let i = floor(p);
    let f = fract(p);

    let a = hash(i);
    let b = hash(i + vec2<f32>(1.0, 0.0));
    let c = hash(i + vec2<f32>(0.0, 1.0));
    let d = hash(i + vec2<f32>(1.0, 1.0));

    let u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
}

// biomechanikus fal – csigolyák + bordák
fn mapScene(p0 : vec3<f32>) -> f32
{
    var p = p0;

    let center = tunnelCenter(p.z);

    p.x = p.x - center.x;
    p.y = p.y - center.y;

    // alap tunnel radius
    let baseRadius =
        1.35 +
        0.10 *
        sin(p.z * 2.5 + uniforms.time * 0.4);

    // organikus zaj a falon
    let radialNoise =
        (noise(p.xy * 1.8) - 0.5) * 0.25;

    let radius =
        baseRadius + radialNoise;

    let tunnelWall =
        abs(length(p.xy) - radius);

    // csigolyák – torus jellegű gyűrűk
    let ringZ =
        p.z * 0.35;

    let ringPhase =
        fract(ringZ) - 0.5;

    let ribCore =
        abs(ringPhase) - 0.06;

    // bordák – enyhe hullámzás
    let ribWave =
        0.04 *
        sin(p.z * 6.0) *
        cos(p.y * 3.0);

    let rib =
        max(ribCore + ribWave, 0.0);

    // fal + csigolyák smooth kombinációja
    let structure =
        max(tunnelWall, rib);

    return structure;
}

fn getNormal(p : vec3<f32>) -> vec3<f32>
{
    let e = 0.004;

    let dx =
        mapScene(p + vec3<f32>(e,0.0,0.0)) -
        mapScene(p - vec3<f32>(e,0.0,0.0));

    let dy =
        mapScene(p + vec3<f32>(0.0,e,0.0)) -
        mapScene(p - vec3<f32>(0.0,e,0.0));

    let dz =
        mapScene(p + vec3<f32>(0.0,0.0,e)) -
        mapScene(p - vec3<f32>(0.0,0.0,e));

    return normalize(vec3<f32>(dx,dy,dz));
}

@fragment
fn fs_main(input : VSOut)
-> @location(0) vec4<f32>
{
    let uv = input.uv;
    let t  = uniforms.time;

    // kamera a középvonalon halad
    let zPos =
        t * 3.0;

    let center =
        tunnelCenter(zPos);

    let ro =
        vec3<f32>(
            center.x * 0.6,
            center.y * 0.6,
            zPos
        );

    // irány – enyhe spirál, hogy „repülés” érzete legyen
    let target =
        vec3<f32>(
            center.x,
            center.y,
            zPos + 4.0
        );

    let forward =
        normalize(target - ro);

    let right =
        normalize(
            vec3<f32>(
                forward.z,
                0.0,
                -forward.x
            )
        );

    let up =
        normalize(
            cross(right, forward)
        );

    let rd =
        normalize(
            forward +
            uv.x * right * 1.2 +
            uv.y * up    * 0.8
        );

    var total = 0.0;
    var hit = false;
    var p = vec3<f32>(0.0);

    for (var i : i32 = 0; i < 90; i = i + 1)
    {
        p = ro + rd * total;

        let d = mapScene(p);

        if (d < 0.003)
        {
            hit = true;
            break;
        }

        total =
            total +
            max(d, 0.01);

        if (total > 70.0)
        {
            break;
        }
    }

    if (!hit)
    {
        let depth =
            max(0.0, 1.0 - length(uv));

        return vec4<f32>(
            0.02,
            0.06 + depth * 0.18,
            0.10 + depth * 0.28,
            1.0
        );
    }

    let n = getNormal(p);

    let lightDir =
        normalize(
            vec3<f32>(
                0.5,
                0.8,
                -0.4
            )
        );

    let diffuse =
        max(dot(n, lightDir), 0.0);

    let rim =
        pow(
            1.0 -
            max(dot(n, -rd), 0.0),
            3.0
        );

    let bronze =
        vec3<f32>(0.42, 0.28, 0.15);

    let gold =
        vec3<f32>(0.80, 0.66, 0.32);

    let turquoise =
        vec3<f32>(0.15, 0.65, 0.60);

    var color =
        bronze +
        diffuse * gold;

    // csigolyák pulzálása – idő + z
    let pulse =
        0.5 +
        0.5 *
        sin(p.z * 10.0 - t * 8.0);

    let ribGlow =
        pulse * pulse;

    color =
        color +
        turquoise *
        ribGlow *
        0.35 +
        rim * turquoise * 0.25;

    let fog =
        exp(-total * 0.035);

    let fogColor =
        vec3<f32>(0.02, 0.08, 0.10);

    color =
        fogColor * (1.0 - fog) +
        color    * fog;

    return vec4<f32>(color, 1.0);
}

`
        });

    const bindGroupLayout =
        device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: {}
            }]
        });

    const pipelineLayout =
        device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

    const pipeline =
        device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: shader,
                entryPoint: "vs_main"
            },
            fragment: {
                module: shader,
                entryPoint: "fs_main",
                targets: [{ format }]
            },
            primitive: {
                topology: "triangle-list"
            }
        });

    const bindGroup =
        device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: uniformBuffer }
            }]
        });

    function frame(ms) {
        const time = ms * 0.001;
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

        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();

        device.queue.submit([encoder.finish()]);
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

init();
