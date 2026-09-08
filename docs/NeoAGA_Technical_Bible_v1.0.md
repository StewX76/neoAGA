Project: A1200 Dreams of Tomorrow

Document Type: Technical Architecture
 Version: 1.0
 Status: Foundation Specification
 Target Runtime: Chrome / Edge (WebGPU)

1. Alapfilozófia

A NeoAGA technikai oldalon sem egy videojáték.

Nem engine.

Nem webalkalmazás.

Hanem egy realtime GPU-műalkotás.

A rendszer elsődleges célja:

Plain Text
1
Visual Quality > Simplicity > FPS > Features
További vonalak megjelenítése

Nem szeretnénk:

editorokat
scene-builder GUI-t
drag and drop rendszereket

Szeretnénk:

shader-központú fejlesztést
gyors iterációt
élő paraméterezést
vibe-codingot
2. Technológiai Stack
Core
Plain Text
1
TypeScript
2
WebGPU
3
WGSL
4
Vite
További vonalak megjelenítése
Audio

Első verzió:

Plain Text
1
HTML Audio
2
Web Audio API
További vonalak megjelenítése

Később:

Plain Text
1
XM playback
2
MOD playback
3
FFT analysis
További vonalak megjelenítése
Build
Plain Text
1
Vite
2
ESBuild
További vonalak megjelenítése
Deployment
Plain Text
1
GitHub Pages
2
Netlify
3
Vercel
További vonalak megjelenítése
3. Projekt Struktúra
Plain Text
1
neoaga/
2
 
3
src/
4
 
5
engine/
6
 
7
renderer/
8
timeline/
9
audio/
10
camera/
11
input/
12
resources/
13
 
14
effects/
15
 
16
plasma/
17
tunnel/
18
biomech/
19
terrain/
20
morph/
21
copper/
22
 
23
shaders/
24
 
25
common/
26
sdf/
27
noise/
28
palette/
29
lighting/
30
 
31
scenes/
32
 
33
boot/
34
plasma_dream/
35
tunnel/
36
mechanical_garden/
37
voxel_sky/
38
finale/
39
 
40
assets/
41
 
42
music/
43
textures/
44
logos/
45
 
46
config/
47
 
48
tests/
49
 
50
index.html
51
main.ts
További vonalak megjelenítése
4. Render Pipeline

A demó teljes egészében fullscreen GPU render.

Nem használunk klasszikus 3D objektumokat.

A legtöbb jelenet:

Plain Text
1
Fullscreen Triangle
2
+
3
Raymarching
4
+
5
WGSL Fragment Shader
További vonalak megjelenítése

modellre épül.

Miért?

Mert:

egyszerű
gyors
shader-központú
a legtöbb effekt közös kódbázist használhat
5. Render Loop

Minden frame:

Plain Text
1
Input
2
 
3
↓
4
 
5
Audio Analysis
6
 
7
↓
8
 
9
Timeline Update
10
 
11
↓
12
 
13
Camera Update
14
 
15
↓
16
 
17
Uniform Upload
18
 
19
↓
20
 
21
Scene Render
22
 
23
↓
24
 
25
PostFX
26
 
27
↓
28
 
29
Present
További vonalak megjelenítése
6. Globális Uniform Buffer

Minden shader ugyanazt a struktúrát kapja.

WGSL
1
struct GlobalData
2
{
3
time : f32,
4
beat : f32,
5
energy : f32,
6
 
7
resolution : vec2<f32>,
8
 
9
cameraPos : vec3<f32>,
10
cameraDir : vec3<f32>,
11
 
12
sceneBlend : f32
13
}
További vonalak megjelenítése
Miért fontos?

Mert így:

minden effekt kompatibilis
egyszerű a scene transition
könnyű a későbbi bővítés
7. Audio Rendszer

A NeoAGA nem timeline-demó.

Hanem zenevezérelt demó.

Ezért az audio kulcsszereplő.

FFT Bands
Plain Text
1
Sub
2
Bass
3
Low Mid
4
Mid
5
High
6
Air
További vonalak megjelenítése

Minden shader láthatja.

Példa:

TypeScript
1
audio.bass
2
audio.mid
3
audio.high
További vonalak megjelenítése
Shader példa

Tunnel fala reagál:

Plain Text
1
Bass → pulzálás
2
 
3
Mid → deformáció
4
 
5
High → emisszió
További vonalak megjelenítése
8. Kamera Rendszer

Nem FPS kamera.

Nem szabad mozgás.

Filmes.

Kamera splinek
Plain Text
1
position curve
2
 
3
look-at curve
4
 
5
roll curve
További vonalak megjelenítése

Példa:

Plain Text
1
0s → Tunnel entry
2
 
3
15s → Spiral dive
4
 
5
32s → Chamber reveal
További vonalak megjelenítése
9. Shader Architektúra

Minden effekt ugyanazt az alapot használja.

Rétegek
Layer 1

Matematika

Plain Text
1
noise
2
hash
3
fbm
4
rotation
5
smoothing
6
``
További vonalak megjelenítése
Layer 2

SDF

Plain Text
1
sphere
2
box
3
capsule
4
torus
5
blob
További vonalak megjelenítése
Layer 3

Scene Generator

Plain Text
1
Tunnel
2
Garden
3
Terrain
4
Morph
További vonalak megjelenítése
Layer 4

Lighting

Plain Text
1
Diffuse
2
Specular
3
Rim
4
Fog
5
Glow
További vonalak megjelenítése
Layer 5

Palette

NeoAGA színek.

10. Organic Tunnel
Első Prototípus

Ez lesz az első valódi milestone.

Alapötlet

Nem fém alagút.

Nem sci-fi cső.

Hanem:

Plain Text
1
csont
2
+
3
fa gyökér
4
+
5
áramkör
További vonalak megjelenítése

keveréke.

Megvalósítás

SDF alagút.

Centerline:

Plain Text
1
3D Noise Field
További vonalak megjelenítése

követi.

Fal:

Plain Text
1
Torus repetition
2
+
3
organic distortion
További vonalak megjelenítése

Animáció:

Plain Text
1
Bass = lélegzés
2
``
További vonalak megjelenítése

Fény:

Plain Text
1
Ancient Gold
2
 
3
Burned Bronze
4
 
5
Turquoise Accent
6
 
További vonalak megjelenítése
11. Mechanical Garden
Legösszetettebb Shader

A demó szíve.

SDF objektumok:

Plain Text
1
capsule
2
blob
3
tube
4
sphere
További vonalak megjelenítése

összenőnek.

Technika:

Plain Text
1
Smooth Union
További vonalak megjelenítése

Hatás:

Mintha élő szerkezet növekedne.

12. Voxel Sky

Nem valódi voxel engine.

Használunk:

Plain Text
1
Height Field Raymarch
2
``
További vonalak megjelenítése

megoldást.

Előny:

gyors
szép
egyszerű

Kinézet:

Plain Text
1
Lebegő szigetek
2
 
3
Arany köd
4
 
5
Távoli napfény
További vonalak megjelenítése
13. Morph Engine

A NeoAGA egyik fő attrakciója.

Forma A

Plain Text
1
Tunnel
További vonalak megjelenítése

↓

Forma B

Plain Text
1
Biomech
További vonalak megjelenítése

↓

Forma C

Plain Text
1
Logo
2
 
További vonalak megjelenítése

Technika:

Plain Text
1
SDF Interpolation
További vonalak megjelenítése

Példa:

WGSL
1
mix(
2
distanceA,
3
distanceB,
4
t
5
)
További vonalak megjelenítése
14. Copper Dream System

A leginkább "Amiga" elem.

Nem valódi copper.

Hanem modern reinterpretáció.

Elemek:

Plain Text
1
Gradient sweeps
2
 
3
Moving bands
4
 
5
Scanline glow
6
 
7
Raster echoes
8
 
9
Feedback trails
További vonalak megjelenítése

Használat:

Minden jelenetben.

Nagyon finoman.

15. Timeline Motor

JSON alapú.

Példa:

JSON
1
[
2
{
3
"time": 0,
4
"scene": "boot"
5
},
6
 
7
{
8
"time": 30,
9
"scene": "plasma"
10
},
11
 
12
{
13
"time": 70,
14
"scene": "tunnel"
15
},
16
 
17
{
18
"time": 110,
19
"scene": "garden"
20
},
21
 
22
{
23
"time": 160,
24
"scene": "sky"
25
},
26
 
27
{
28
"time": 200,
29
"scene": "finale"
30
}
31
]
További vonalak megjelenítése
16. Scene Transition System

Tilos:

Plain Text
1
Hard Cut
További vonalak megjelenítése

Használható:

Plain Text
1
Fog Blend
2
 
3
Morph Blend
4
 
5
Light Wash
6
 
7
Geometry Dissolve
8
 
9
Feedback Transition
További vonalak megjelenítése

NeoAGA szabály:

Jelenet nem vált.

Jelenet álmodik át a következő jelenetbe.

17. Performance Célok

Minimum:

Plain Text
1
1920x1080
2
60 FPS
További vonalak megjelenítése

Ideális:

Plain Text
1
2560x1440
2
120 FPS
További vonalak megjelenítése

Elfogadható GPU-k:

Plain Text
1
RTX 3060+
2
 
3
RX 6700+
4
 
5
Intel Arc
További vonalak megjelenítése
18. Milestone Terv
M1

NeoAGA Lab

WebGPU bootstrap
fullscreen shader
M2

Organic Tunnel

raymarch
audio sync
M3

Mechanical Garden

smooth unions
biomech growth
M4

Voxel Sky

atmosphere
volumetric fog
M5

Timeline

scene orchestration
M6

Final Morph

logo emergence
19. Coding Manifesto
Plain Text
1
A shader az első.
2
 
3
A hangulat fontosabb a technikánál.
4
 
5
A matematika láthatatlan marad.
6
 
7
A néző nem effekteket lát.
8
 
9
A néző egy gép álmát látja.
További vonalak megjelenítése
NeoAGA v1.0 Architektúra-jelszó

"Code like it's 2002. Render like it's 2092."

A következő dokumentum logikusan már a NeoAGA Prototype Spec 0.1, amely konkrétan az első Organic Tunnel shader matematikáját, kameraútját, színrendszerét és a Vite + TypeScript + WebGPU projekt vázát definiálja.

A BizChattel kapcsolatos visszajelzés küldése
