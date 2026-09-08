const canvas = document.getElementById("gfx");

async function init() {

    if (!navigator.gpu) {
        document.body.innerHTML = "<h1>WebGPU not supported</h1>";
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) {
        document.body.innerHTML = "<h1>No GPU adapter</h1>";
        return;
    }

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

    const shader = device.createShaderModule({
        code: `
@vertex
fn vs_main(
    @builtin(vertex_index) index : u32
)
-> @builtin(position) vec4<f32>
{
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -3.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(3.0, 1.0)
    );

    return vec4<f32>(
        pos[index],
        0.0,
        1.0
    );
}

@fragment
fn fs_main()
-> @location(0) vec4<f32>
{
    return vec4<f32>(
        1.0,
        0.0,
        0.0,
        1.0
    );
}
`
    });

    const pipeline = device.createRenderPipeline({
        layout: "auto",

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

    function frame() {

        const encoder =
            device.createCommandEncoder();

        const pass =
            encoder.beginRenderPass({
                colorAttachments: [{
                    view: context
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
        pass.draw(3);
        pass.end();

        device.queue.submit([
            encoder.finish()
        ]);

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

init();
