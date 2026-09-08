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

    const shader = device.createShaderModule({
        code: `
struct Uniforms {
    time : f32
}

@group(0) @binding(0)
var<uniform> uniforms : Uniforms;

@vertex
fn vs_main(
    @builtin(vertex_index) i : u32
)
-> @builtin(position) vec4<f32>
{
    var pos = array<vec2<f32>,3>(
        vec2(-1.0,-3.0),
        vec2(-1.0, 1.0),
        vec2( 3.0, 1.0)
    );

    return vec4(
        pos[i],
        0.0,
        1.0
    );
}

@fragment
fn fs_main()
-> @location(0) vec4<f32>
{
    let t = uniforms.time;

    let r =
        0.1 + sin(t) * 0.1;

    let g =
        0.12 + sin(t*0.5) * 0.08;

    let b =
        0.04 + sin(t*0.25) * 0.03;

    return vec4(
        r,
        g,
        b,
        1.0
    );
}
`
    });

    const uniformBuffer =
        device.createBuffer({
            size: 16,
            usage:
                GPUBufferUsage.UNIFORM |
                GPUBufferUsage.COPY_DST
        });

    const bindGroupLayout =
        device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility:
                        GPUShaderStage.FRAGMENT,
                    buffer: {}
                }
            ]
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
            layout: bindGroupLayout,

            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer:
                            uniformBuffer
                    }
                }
            ]
        });

    function frame(ms) {

        const time =
            ms * 0.001;

        device.queue.writeBuffer(
            uniformBuffer,
            0,
            new Float32Array([time])
        );

        const encoder =
            device.createCommandEncoder();

        const pass =
            encoder.beginRenderPass({

                colorAttachments: [

                {
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
                }

                ]
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
