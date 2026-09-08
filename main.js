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
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>
};

@vertex
fn vs_main(
    @builtin(vertex_index) index : u32
) -> VSOut {

    var pos = array<vec2<f32>,3>(
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

@fragment
fn fs_main(
    input : VSOut
) -> @location(0) vec4<f32>
{
    let t =
        uniforms.time;

    let uv =
        input.uv;

    let r =
        length(uv);

    let angle =
        atan2(
            uv.y,
            uv.x
        );

    let rings =
        sin(
            r * 20.0
            -
            t * 8.0
        );

    let swirl =
        sin(
            angle * 6.0
            +
            t * 2.0
        );

    let brightness =
        max(
            rings * swirl,
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

    let color =
        bronze * 0.3
        +
        gold * brightness;

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
                visibility: GPUShaderStage.FRAGMENT,
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

            layout: pipelineLayout,

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

    function frame(ms) {

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
