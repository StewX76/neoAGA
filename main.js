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

const MAX_STEPS : i32 = 96;
const MAX_DIST : f32 = 80.0;
const EPSILON : f32 = 0.001;

fn rot(a:f32)->mat2x2<f32>{
    let c=cos(a);
    let s=sin(a);

    return mat2x2<f32>(
        c,-s,
        s, c
    );
}

fn hash(p:vec3<f32>) -> f32
{
    return fract(
        sin(
            dot(
                p,
                vec3<f32>(
                    127.1,
                    311.7,
                    74.7
                )
            )
        ) * 43758.5453
    );
}

fn noise(p:vec3<f32>) -> f32
{
    let i=floor(p);
    let f=fract(p);

    let u=f*f*(3.0-2.0*f);

    return mix(
        mix(
            mix(
                hash(i+vec3(0,0,0)),
                hash(i+vec3(1,0,0)),
                u.x
            ),
            mix(
                hash(i+vec3(0,1,0)),
                hash(i+vec3(1,1,0)),
                u.x
            ),
            u.y
        ),
        mix(
            mix(
                hash(i+vec3(0,0,1)),
                hash(i+vec3(1,0,1)),
                u.x
            ),
            mix(
                hash(i+vec3(0,1,1)),
                hash(i+vec3(1,1,1)),
                u.x
            ),
            u.y
        ),
        u.z
    );
}

fn fbm(p:vec3<f32>) -> f32
{
    var q=p;
    var a=0.5;
    var v=0.0;

    for(var i=0;i<5;i++)
    {
        v+=noise(q)*a;
        q*=2.0;
        a*=0.5;
    }

    return v;
}

fn tunnelCenter(z:f32)->vec2<f32>
{
    return vec2<f32>(
        sin(z*0.20)*1.2,
        cos(z*0.13)*0.8
    );
}

fn map(pos:vec3<f32>)->f32
{
    var p=pos;

    p.xy-=tunnelCenter(p.z);

    let n=
        fbm(
            p*0.7+
            uniforms.time*0.2
        );

    let radius=
        2.2+
        n*0.6;

    return length(p.xy)-radius;
}

fn normal(p:vec3<f32>) -> vec3<f32>
{
    let e=0.002;

    return normalize(
        vec3<f32>(
            map(p+vec3(e,0,0))-map(p-vec3(e,0,0)),
            map(p+vec3(0,e,0))-map(p-vec3(0,e,0)),
            map(p+vec3(0,0,e))-map(p-vec3(0,0,e))
        )
    );
}

fn palette(t:f32)->vec3<f32>
{
    let bronze=
        vec3<f32>(
            0.45,
            0.30,
            0.16
        );

    let gold=
        vec3<f32>(
            0.72,
            0.60,
            0.28
        );

    let accent=
        vec3<f32>(
            0.15,
            0.65,
            0.60
        );

    return mix(
        bronze,
        gold,
        t
    )+accent*pow(t,8.0);
}

@vertex
fn vs_main(
    @builtin(vertex_index)
    index:u32
)
-> @builtin(position)
vec4<f32>
{
    var pos=array<vec2<f32>,3>(
        vec2(-1,-3),
        vec2(-1,1),
        vec2(3,1)
    );

    return vec4(
        pos[index],
        0,
        1
    );
}

@fragment
fn fs_main(
    @builtin(position)
    fragCoord:vec4<f32>
)
-> @location(0)
vec4<f32>
{
    let resolution=
        vec2<f32>(
            1920.0,
            1080.0
        );

    let uv=
        (
            fragCoord.xy*2.0
            -resolution
        )
        /resolution.y;

    let t=
        uniforms.time;

    let ro=
        vec3<f32>(
            0.0,
            0.0,
            t*4.0
        );

    let look=
        ro+
        vec3<f32>(
            0.0,
            0.0,
            2.0
        );

    let fw=
        normalize(
            look-ro
        );

    let rt=
        normalize(
            cross(
                vec3(0,1,0),
                fw
            )
        );

    let up=
        cross(
            fw,
            rt
        );

    let rd=
        normalize(
            fw+
            uv.x*rt+
            uv.y*up
        );

    var dist=0.0;
    var hit=false;
    var p=ro;

    for(var i=0;i<MAX_STEPS;i++)
    {
        p=ro+rd*dist;

        let d=map(p);

        if(abs(d)<EPSILON)
        {
            hit=true;
            break;
        }

        dist+=d;

        if(dist>MAX_DIST)
        {
            break;
        }
    }

    if(!hit)
    {
        return vec4(
            0.01,
            0.01,
            0.015,
            1.0
        );
    }

    let n=
        normal(p);

    let lightDir=
        normalize(
            vec3<f32>(
                0.5,
                0.8,
                -0.3
            )
        );

    let diff=
        max(
            dot(n,lightDir),
            0.0
        );

    let fres=
        pow(
            1.0-
            max(dot(n,-rd),0.0),
            4.0
        );

    let glow=
        fbm(
            p*2.0
        );

    let color=
        palette(diff)
        +
        fres*0.4
        +
        glow*0.1;

    return vec4(
        color,
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
