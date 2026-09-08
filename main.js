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
        code: `struct Uniforms {
    time : f32,
    pad0 : f32,
    pad1 : f32,
    pad2 : f32
};

@group(0) @binding(0)
var<uniform> uniforms : Uniforms;

@vertex
fn vs_main(
    @builtin(vertex_index) index : u32
)
-> @builtin(position) vec4<f32>
{
    var pos = array<vec2<f32>,3>(
        vec2<f32>(-1.0,-3.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>( 3.0, 1.0)
    );

    return vec4<f32>(
        pos[index],
        0.0,
        1.0
    );
}

@fragment
fn fs_main(
    @builtin(position) fragCoord : vec4<f32>
)
-> @location(0) vec4<f32>
{
    let resolution =
        vec2<f32>(
            1920.0,
            1080.0
        );

    let uv =
        (
            fragCoord.xy * 2.0
            - resolution
        )
        / resolution.y;

    let t =
        uniforms.time;

    let angle =
        atan2(
            uv.y,
            uv.x
        );

    let radius =
        length(uv);

    let tunnel =
        0.15 /
        abs(
            radius
            -
            0.4
            +
            sin(
                angle * 6.0
                +
                t * 2.0
            ) * 0.05
        );

    let stripes =
        sin(
            20.0 / max(radius,0.05)
            -
            t * 8.0
        );

    let glow =
        max(
            stripes,
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
        bronze * tunnel;

    color +=
        gold * glow * 0.8;

    color +=
        turquoise *
        pow(
            glow,
            4.0
        ) *
        0.6;

    let vignette =
        smoothstep(
            1.4,
            0.2,
            radius
        );

    color *= vignette;

    return vec4<f32>(
        color,
        1.0
    );
}
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
