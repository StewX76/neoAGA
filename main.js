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
    time : f32,
    pad0 : f32,
    pad1 : f32,
    pad2 : f32
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

fn tunnelCenter(
    z : f32
) -> vec2<f32>
{
    return vec2<f32>(
        sin(z * 0.22) * 0.8,
        cos(z * 0.15) * 0.6
    );
}

fn mapScene(
    p0 : vec3<f32>
) -> f32
{
    var p = p0;

    let c =
        tunnelCenter(
            p.z
        );

    p.x = p.x - c.x;
    p.y = p.y - c.y;

    let radius =
        1.4 +
        0.10 *
        sin(
            p.z * 4.0
            +
            uniforms.time
        );

    return abs(
        length(p.xy)
        - radius
    );
}

fn getNormal(
    p : vec3<f32>
) -> vec3<f32>
{
    let e = 0.005;

    let dx =
        mapScene(
            p + vec3<f32>(e,0.0,0.0)
        )
        -
        mapScene(
            p - vec3<f32>(e,0.0,0.0)
        );

    let dy =
        mapScene(
            p + vec3<f32>(0.0,e,0.0)
        )
        -
        mapScene(
            p - vec3<f32>(0.0,e,0.0)
        );

    let dz =
        mapScene(
            p + vec3<f32>(0.0,0.0,e)
        )
        -
        mapScene(
            p - vec3<f32>(0.0,0.0,e)
        );

    return normalize(
        vec3<f32>(
            dx,
            dy,
            dz
        )
    );
}

@fragment
fn fs_main(
    input : VSOut
)
-> @location(0)
vec4<f32>
{
    let uv =
        input.uv;

    let t =
        uniforms.time;

    let ro =
        vec3<f32>(
            0.0,
            0.0,
            t * 3.0
        );

    let rd =
        normalize(
            vec3<f32>(
                uv.x,
                uv.y,
                1.5
            )
        );

    var total =
        0.0;

    var hit =
        false;

    var p =
        vec3<f32>(0.0);

    for(
        var i : i32 = 0;
        i < 64;
        i = i + 1
    )
    {
        p =
            ro
            +
            rd * total;

        let d =
            mapScene(p);

        if(d < 0.005)
        {
            hit = true;
            break;
        }

        total =
            total
            +
            max(
                d,
                0.01
            );

        if(total > 50.0)
        {
            break;
        }
    }

    if(!hit)
    {
        let sky =
            0.3 -
            length(uv) * 0.2;

        return vec4<f32>(
            0.02,
            0.05 + sky * 0.2,
            0.08 + sky * 0.3,
            1.0
        );
    }

    let n =
        getNormal(p);

    let lightDir =
        normalize(
            vec3<f32>(
                0.5,
                0.7,
                -0.4
            )
        );

    let diffuse =
        max(
            dot(
                n,
                lightDir
            ),
            0.0
        );

    let bronze =
        vec3<f32>(
            0.45,
            0.30,
            0.16
        );

    let gold =
        vec3<f32>(
            0.72,
            0.60,
            0.28
        );

    let turquoise =
        vec3<f32>(
            0.15,
            0.65,
            0.60
        );

    var color =
        bronze +
        diffuse * gold;

    let pulse =
        0.5 +
        0.5 *
        sin(
            p.z * 8.0
            -
            t * 10.0
        );

    color =
        color +
        turquoise *
        pulse *
        0.20;

    let fog =
        exp(
            -total * 0.03
        );

    color =
        vec3<f32>(
            0.02,
            0.08,
            0.10
        ) * (1.0 - fog)
        +
        color * fog;

    return vec4<f32>(
        color,
        1.0
    );
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
                targets: [{ format }]
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

        device.queue.writeBuffer(
            uniformBuffer,
            0,
            new Float32Array([
                time,
                0,
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
