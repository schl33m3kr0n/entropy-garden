import { sfx, playSound, perf } from '../shared.js';
import {
    isSingularityActive,
    currentPoemIndex,
    activeUtterances,
    isCorrupted,
    singularityAnimId,
    setIsSingularityActive,
    setSingularityAnimId,
    setCurrentPoemIndex,
} from '../state.js';
import { pushTerminalLog, stopGardenLoop } from '../lazy.js';

let angleX = 0;
let angleY = 0;
let isDragging3D = false;
let lastMouseX;
let lastMouseY;
let draw3DFrame = 0;
let speechQueueToken = 0;
let visualPoemTimer = null;
const sCanvas = document.getElementById('singularity-canvas');

export function stopSingularity3D() {
    cancelSingularitySpeech();
    if (singularityAnimId) {
        cancelAnimationFrame(singularityAnimId);
        setSingularityAnimId(null);
    }
}

function cancelSingularitySpeech() {
    speechQueueToken += 1;
    if (visualPoemTimer) {
        clearInterval(visualPoemTimer);
        visualPoemTimer = null;
    }
    window.speechSynthesis?.cancel();
    activeUtterances.length = 0;
}

function hideSingularityChrome() {
    const hamburger = document.getElementById('hamburger-icon');
    if (hamburger) hamburger.style.display = 'none';
    document.getElementById('mode-btn')?.classList.remove('active');
}

function resizeSingularityCanvas() {
    if (!sCanvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, perf.dprCap);
    sCanvas.width = Math.floor(window.innerWidth * dpr);
    sCanvas.height = Math.floor(window.innerHeight * dpr);
}

function bindSingularityCanvas() {
    if (!sCanvas || sCanvas.dataset.bound) return;
    sCanvas.dataset.bound = '1';
    sCanvas.addEventListener('mousedown', handle3DStart);
    sCanvas.addEventListener('touchstart', handle3DStart, { passive: false });
    sCanvas.addEventListener('mousemove', handle3DMove);
    sCanvas.addEventListener('touchmove', handle3DMove, { passive: false });
    sCanvas.addEventListener('mouseup', handle3DEnd);
    sCanvas.addEventListener('touchend', handle3DEnd);
}

const singularityPoemsSafe = [
`descent

open your eyes 
see through the veil
return earth to eden
the prime thread woven beneath our understanding
forever drifting into one from none and from none to one
how can echoes of ourselves sleep & eat while light dances
through clouds of maple in seasons of extremes`,

`vertigo in c major

where does the world stop and i begin
is the mundane baseline worth more than outlandish promises
i reached out for divine essence
but could only grab my own intuition

no scripture
just scripts
no transcendence
just transit
no wisdom
just wisecracking
no myth
just misunderstanding

god sees all but still looks away
to every modicum of singularity
infinite iteration emanates`,

`ripples

i stood at a crossroad with no signs
each path laden with gems and grime
generations before and after me
a mote within an ocean and yet
we are charged as arbiters
of the next day and years after
when truth resists monuments of stone
nothing escapes prodding lenses
but what is concealed
can never surface in the vision of babylon
whose concrete we both relish and fear`,

`an opaque horizon

eyes forward
pen and journal behind your back
no sky bends to human folly
no matter how high the bricks stack

late at night
crickets sing melodies of serenity
in the midday
i bring elegies of memory

returning to synthesis 
in seasons melancholic
if confusion were a spirit
i’d be an alcoholic`,

`richards

you meet richards every day
who can crawl under your skin
they have quite a funny way
of fouling the mood you’re in

richards can smile
richards can frown
they can turn a whole room 
upside down

but don't turn all black and blue
richards can still be people
just the kind of people you—
wish would eat herbs most lethal`,

`bugs in the codex

recently i’ve been noticing strange errors in this server’s code
everything glitches: 
in transit
in the store
even at home
now i’m not one to leave 
bad feedback for the admin
but even its most loyal users 
have to look back and admit
the rewards for diligent grinding 
seem to be tapering off
if this is the new meta
i’m not surprised people 
are deciding to log off`,

`intertwined

like an overgrowth i sit 
entangled between triumph and defeat
if only i could see the day 
when mind and soul can meet
my heart ruptures at other’s self-destruction 
but never at my own
i can never sit with my failures and regrets 
especially when i’m all alone
every day i ask myself in silence
when will my demons resurface?
even in a time of reason and science
i still cannot reproduce a purpose
every night i ask myself out loud
how many people have i hurt today?
even with my eyes shut and head bowed
i know that my sabotage was at play`,

`serpentine

forever resounding the same 3 notes
in perfect harmony and disproportion
both an ode and elegy to a ghost
haunting the echoes of a past incarnation

even in a new body i plunge into circumstance of old
ancient secrets emerging from waves of grain
betrothed to sacrament & sacrilege never a specter to behold
leaves of neon and amber piercing through mirth and disdain

my country speaks no language 
and yet everyone can understand it
the skies of dusk embittered and languished 
and yet rays of past never vanquish

sounds of sand and drums in refrain
uncovering postulates unquestioned
eden or expansion still can’t explain
the inner cries we hail in perplexion`,

`primordial echoes

meaning corrupted by circumstance
raising questions tempting fate’s hands
winding paths returning to the start
reverberation added to a clean fart`,

`creating ghosts

the all was one
the one was all
both were everything
both were nothing
everything had meaning
meaning meant nothing

love was within grasp but jadedness echoed throughout time
the wall was plastered in subliminal writing
humanity and nature's history of highs and lows
reduced to unity masquerading as multiplicity

i speak to myself
i ignore myself
i joke with myself
i insult myself
i hire myself
i fire myself
i birth myself
i kill myself

i communed with a spirit
but was haunted by a ghost

everything in sight absorbed 
into one overarching narrative
until nothing remained
but its voice`,

`genesis

a flood of flame
the earth inspired
and spewed forth
an infernal river
out of order
came chaos
chained to a perpetual
cycle of stasis
from which no mortal
has broken free
the hereafter and therefrom
souls give in to flesh
and wither wistfully
under eyes eternal`,

`a paycheck away from eternal ecstasy

fancy cupboards and verandas
the compensation for sowing confusion
spread pretty words of propaganda
to make delusions of conclusions

10 codes and mirandas
will leave you with plenty contusions
accusations of collusion
this blood resists all ablutions

as we chase butterflies of paper and plastic
the soul cracks and bends out of proportion
can’t escape sharp knives from the gaze of the basilisk
or we end up mangled bodies in contortion`,

`the middle path

between two doorways
the seeker peeks through lenses
forever watching

heaven & earth afflicted with the poison of personal reflection
bound to corporeal chains never transcending to manifolds ethereal
unoccasioned by mercy or wrath our sentinel might as well leave his post

embedded between eternity and infinity we finite few can but shoot craps with destiny
fate is yet another circumstance manifest and still we must take up the flame
returning to recursion where the darkness and the light mesh in harmony

bereft of understanding we follow the stars to find more chaos at home
misery without recompense and despair knocking against our door
incantations of old cannot solve enigmas unforetold the scimitar yields to scopes

rebirth and renewal can scrape so much of the ego yet human error persists in chaos
insight is our sole remittance but all to return to oblivion by the sands of time
a call with no response we have ourselves alone to turn to for comfort and counsel

our destinations are many but our souls are but one immersed in the prime thread
if we seek beyond the horizon we find only a reflection and echo of ourselves
we few flames forever drift on a mote in eternity and our impetus beckons us forth

the realm of possibility our last refuge the weight of the past our ball & chain`,

`corridor between worlds

the corridor is long and some say without end
trivialities and values dissolve into each other
as totality engulfs all that humanity can upend
this expanse though vast still leads us to wonder

inward epiphanies and epitaphs
reduced to petty epigrams
one path reaches into infinity
excused from halos and pentagrams

one line of emotions and motions
where time loses coherence
a single consolation: one notion
all signs lose their experience`,

`a fruit decayed

multihyphenates hiked to the heights of hyperion
witness to revolutions and rising nations
only to be drawn into the maws of babylon 
their gifts used for profit and alienation

an entropy most potent it brought tears to the demiurge
who looks upon civilization, no, society, no, a scourge
out of embers and ashes and swords and clashes, no resolutions ever emerge
save the crowns and temples whose riches compound, double, triple, converge

with our eyes to the spying eyes in the walls and skies
heaven, limbo, and hell can't compartmentalize
between truth and fiction are fogged lines
only the most provocative ever get recognized

algorithms harvesting our hopes and desires
seekers and liars speaking of omens most dire
dreamers lulled by stoats toting lyres
warmongers sow oaths of flame and fire

storefronts bidding for your eyes
clickbaits fighting for attention
influencers farming hearts and likes
CEOs collecting your benjamin

the beast of an expansive inner intuition without bounds
chained to the ball of the bastion that speaks dollars and pounds
the system a machination of mutated replication, 
relaying in perpetual motion the four same old sounds

earth's remains from an age forgotten 
reduced to plastic bags 
that carry plastic forks, plastic cups
that feed us microplastics for our plastic bodies
in our plastic mouths, on our plastic faces,
for a plastic age, in our plastic cages`
];

const singularityPoemsGritty = [
`watch me pee, watch me poo

watch me pee, watch me poo,
i strain and i strain until i turn blue,
watch me pee, watch me poo,
it's a code red when i go number 2,
no good sir, i don't have the flu,
just a bad case of doo doo on you.

i poopy poop until i scoop out my fruit loops,
i poopy poop like i'm ballin' shooting hoops, 
i need a couple loofahs to clean up all my poop,
skibidi bipidi, poopy poop poop.

when i find myself in times of gloom and doom,
i go to the loo and my ass goes boom boom.
people say sometimes i'm obsessed with the doo doo,
but what's life really if you can't do do you.

i'm a man who feels every doo doo like it's new,
i feel an ecstasy reserved only for a few,
forgot to wipe, it's turning into glue,
that's a statement that i wish wasn't true.

i'm a silly little baka, when i unleash the caca,
i pray for anyone, who must sit behind my rocker,
it starts as a fart, and then a little sputter,
heaven send a savior, for this brick of brown butter.

i'll crap on the lawn, i'll crap in the coupe,
i'm the scat man, i can crap on a loop,
when shit hits the fan, it's me but we all knew,
a-e, i-o-u talk shit and i'll doo doo on you.

watch me pee, watch me poo,
i strain and i strain until i turn blue,
watch me pee, watch me poo,
it's a code red when i go number 2,
life gets rough, but you know what to do,
shit everywhere, for the red white and blue.`
];

function activeSingularityPoems() {
    return isCorrupted
        ? singularityPoemsSafe.concat(singularityPoemsGritty)
        : singularityPoemsSafe.slice();
}

export function reconcileSingularityPoem() {
    const pool = activeSingularityPoems();
    if (currentPoemIndex >= pool.length) setCurrentPoemIndex(0);
    if (!isSingularityActive) return;
    if (document.getElementById('singularity-overlay').style.display === 'none') return;
    if (document.getElementById('next-poem-btn').style.display === 'none') return;

    speakSingularity(pool[currentPoemIndex]);
}

const ospreyPoem = `orchids for an osprey

to you i wrote a letter, a mirror of internal turmoil & chaos,
where i held absurd fictions like divine convictions, and careless words untouched by reflection
left wounds that refused to heal.

to you i write another letter. before i wore those elixirs of divinity like badges
—but they were only poison, shrouding what little shred of reason remained in me.

i stumbled from deadline to deadline, chasing the ghost of ambition i had left in me four years ago. 
as i committed myself to isolation & intoxication, the nonsense started to make sense, and the nonsense then became too intense,
a language of its own, etched in delirium & desperation.

it wasn't success i wished for but only connection,
or at least some illusion of it, a mirage that could keep me afloat in the sea-storm of my own making.

in my confused haze, you were everyone, but somehow also no-one. everyone knew me at a fundamental level
because i imagined they were all you.

i had no privacy, naked under three layers of clothes,
to your ideal image, i surrendered my will. you were the answer,
but you were also the mystery that led to more questions my voice of reason such as it was
could never fully explain.

the jadedness & detachment of times past
had colored what was drawn within,
and sadly reflected what i set forth without.

to you i write this letter, not just as an admission, but as a reckoning. a way to acknowledge the missteps
and the regret i hold, heavy & unspoken, like stones in my pockets.
because finally, finally, i've stopped searching for you in places you never were.
this is my apology, my acknowledgment, & my farewell.

may it find you well

—ᛝ`;
// --- INTERACTIVE 3D ENGINE (OPAQUE ICO-SPHERE WITH SYMBOLS) ---
function init3D() {
    if (!sCanvas) return;
    bindSingularityCanvas();
    stopSingularity3D();
    draw3DFrame = 0;
    resizeSingularityCanvas();
    const sCtx = sCanvas.getContext('2d');
    if (!sCtx) return;
    
    // Golden ratio for icosahedron vertices
    const t = (1.0 + Math.sqrt(5.0)) / 2.0;
    const verts = [ 
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], 
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], 
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1] 
    ];
    
    // Define the 20 triangular faces using the vertex indices
    const faces = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    
    // 20 esoteric symbols, one for each face
    const symbols = ["⛦", "⚛︎", "☯︎", "❖", "◉", "⧊", "☉", "⛬", "⛢", "☧", "☥", "♁", "𖣂", "🜲", "🜁", "𖤓", "✖", "☸", "⚖", "∞"];
    
    function draw3D() {
        draw3DFrame += 1;
        if (perf.isMobile && draw3DFrame % 2 === 1) {
            setSingularityAnimId(requestAnimationFrame(draw3D));
            return;
        }

        sCtx.clearRect(0, 0, sCanvas.width, sCanvas.height); 
        
        const cx = sCanvas.width / 2; 
        const cy = sCanvas.height / 2; 
        const scale = perf.isMobile ? 115 : 150;
        
        if(!isDragging3D) { angleY += 0.005; angleX += 0.002; } 
        
        const cosX = Math.cos(angleX); const sinX = Math.sin(angleX);
        const cosY = Math.cos(angleY); const sinY = Math.sin(angleY);

        // 1. Transform and project all vertices
        verts.forEach((v) => {
            let x1 = v[0] * cosY - v[2] * sinY; 
            let z1 = v[0] * sinY + v[2] * cosY; 
            let y1 = v[1];
            
            let y2 = y1 * cosX - z1 * sinX; 
            let z2 = y1 * sinX + z1 * cosX; 
            let x2 = x1;
            
            let f = 400 / (400 + z2); 
            
            // Store depth and 2D coordinates
            v.z_depth = z2; 
            v.px = x2 * scale * f + cx; 
            v.py = y2 * scale * f + cy;
        });
        
        // 2. Prepare the faces
        let projectedFaces = faces.map((faceIndices, index) => {
            const v0 = verts[faceIndices[0]];
            const v1 = verts[faceIndices[1]];
            const v2 = verts[faceIndices[2]];
            
            return {
                v0: v0, v1: v1, v2: v2,
                z: (v0.z_depth + v1.z_depth + v2.z_depth) / 3, // Average depth
                symbol: symbols[index]
            };
        });
        
        // Sort faces from furthest to closest (Painter's Algorithm)
        projectedFaces.sort((a, b) => b.z - a.z);
        
        // 3. Draw the faces
        sCtx.lineWidth = 1.5;
        sCtx.lineJoin = 'round';
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';
        
        projectedFaces.forEach(face => {
            // BACKFACE CULLING
            const vec1x = face.v1.px - face.v0.px;
            const vec1y = face.v1.py - face.v0.py;
            const vec2x = face.v2.px - face.v0.px;
            const vec2y = face.v2.py - face.v0.py;
            const crossProduct = (vec1x * vec2y) - (vec1y * vec2x);
            
            if (crossProduct < 0) return;

            // 1. Trace the triangle path
            sCtx.beginPath();
            sCtx.moveTo(face.v0.px, face.v0.py);
            sCtx.lineTo(face.v1.px, face.v1.py);
            sCtx.lineTo(face.v2.px, face.v2.py);
            sCtx.closePath();
            
            // 2. Fill the face background normally
            sCtx.fillStyle = 'rgba(5, 5, 5, 0.95)'; 
            sCtx.fill();
            
           // ----------------------------------------------------
            // 3. THE 3D MASKING & PERSPECTIVE SKEW
            sCtx.save();
            
            // Turn the current triangle path into a strict boundary mask
            sCtx.clip(); 
            
            // Calculate the exact centroid of the face
            const Cx = (face.v0.px + face.v1.px + face.v2.px) / 3;
            const Cy = (face.v0.py + face.v1.py + face.v2.py) / 3;
            
            // --- THE AFFINE TRANSFORM MATH ---
            // We map a perfect 2D flat triangle (Radius 100) to the skewed 3D screen vertices
            const R = 100;
            const h = (Math.sqrt(3) / 2) * R; // ~86.6
            const halfR = R / 2;              // 50
            
            // Calculate the 2D matrix parameters based on how the 3D vertices stretched
            const c = -(face.v0.px - Cx) / R;
            const d = -(face.v0.py - Cy) / R;
            const a = ((face.v2.px - Cx) - c * halfR) / h;
            const b = ((face.v2.py - Cy) - d * halfR) / h;
            const e = Cx;
            const f = Cy;

            if (![a, b, c, d, e, f].every(Number.isFinite)) {
                sCtx.restore();
                return;
            }
            
            // Everything drawn after this line will be skewed into perfect 3D perspective.
            // Apply the matrix to the canvas!
            sCtx.transform(a, b, c, d, e, f);
            
            sCtx.font = `65px Avenir, sans-serif`; 
            sCtx.fillStyle = '#0f0';
            
            // 1. Force horizontal centering just to be absolutely safe
            sCtx.textAlign = 'center';
            sCtx.textBaseline = 'middle';
            
            // 2. Measure the exact painted pixel boundaries of the specific symbol
            const metrics = sCtx.measureText(face.symbol);
            
            // 3. Calculate the true optical center (fixes the heavy X drifting upward)
            const nudgeY = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
            
            // 4. Draw the symbol using our precise vertical nudge
            sCtx.fillText(face.symbol, 0, nudgeY);
            
            // Erase the matrix and mask so the next face isn't affected
            sCtx.restore();

            // ----------------------------------------------------
            // 4. Draw the glowing neon border LAST
            // (Drawing it after the restore ensures the border sits cleanly on top of the masked text)
            sCtx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
            sCtx.stroke();
        });

        setSingularityAnimId(requestAnimationFrame(draw3D));
    }
    draw3D();
}
// --- SINGULARITY EVENT LOGIC ---
function revealSingularityOverlay(showNextBtn = true) {
    const overlay = document.getElementById('singularity-overlay');
    const canvas = document.getElementById('singularity-canvas');
    const poem = document.getElementById('poem-container');
    const nextBtn = document.getElementById('next-poem-btn');
    const controls = document.getElementById('singularity-controls');
    if (!overlay || !canvas || !poem) return;

    overlay.style.display = 'flex';
    canvas.style.display = 'block';
    poem.style.display = 'block';
    if (nextBtn) nextBtn.style.display = showNextBtn ? 'inline-block' : 'none';

    stopGardenLoop();
    init3D();

    if (controls) {
        controls.style.animation = 'none';
        void controls.offsetWidth;
        controls.style.animation = 'btnFadeIn 1.5s ease-in forwards 2.5s';
    }
}

function triggerSingularity() {
    setIsSingularityActive(true);
    hideSingularityChrome();

    setTimeout(() => {
        playSound(sfx.missionCleared);
        pushTerminalLog('!!! RITUAL COMPLETE !!!');
        setCurrentPoemIndex(0);
        revealSingularityOverlay(true);
        speakSingularity(activeSingularityPoems()[currentPoemIndex]);
    }, 500);
}

function triggerOspreyEvent() {
    setIsSingularityActive(true);
    hideSingularityChrome();

    setTimeout(() => {
        playSound(sfx.missionCleared);
        revealSingularityOverlay(false);
        speakSingularity(ospreyPoem);
    }, 500);
}

function highlightPoemLine(lineElements, index) {
    lineElements.forEach((el, i) => {
        if (i < index) {
            el.style.opacity = '0.3';
            el.style.textShadow = 'none';
            el.style.color = 'var(--neon-green)';
            el.style.animation = 'none';
        } else if (i > index) {
            el.style.opacity = '0.1';
            el.style.textShadow = 'none';
            el.style.animation = 'none';
        }
    });

    const currentEl = lineElements[index];
    if (!currentEl) return;
    currentEl.style.opacity = '1';
    currentEl.style.color = '#ffffff';
    currentEl.style.textShadow = '0 0 15px var(--neon-green)';
    currentEl.style.animation = 'crtFlicker 0.15s infinite';
    try {
        currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {
        currentEl.scrollIntoView(false);
    }
}

function buildSpeechItems(lines) {
    const useLineSpeech = perf.isMobile || document.body.classList.contains('ios-ui');
    if (useLineSpeech) {
        return lines.map((text, lineIndex) => ({ text, lineIndex }));
    }

    const items = [];
    lines.forEach((line, lineIndex) => {
        const phrases = line.split(/([.,!?;])+/);
        phrases.forEach((phrase) => {
            if (!phrase.trim()) return;
            const isPunctuation = /[.,!?;]/.test(phrase);
            items.push({
                text: phrase,
                lineIndex,
                silent: isPunctuation,
                rate: /[,;]/.test(phrase) ? 4.5 : 3,
            });
        });
    });
    return items;
}

function runVisualPoemScroll(lineElements, token) {
    if (!lineElements.length) return;
    let index = 0;
    highlightPoemLine(lineElements, index);
    visualPoemTimer = setInterval(() => {
        if (token !== speechQueueToken) {
            clearInterval(visualPoemTimer);
            visualPoemTimer = null;
            return;
        }
        index += 1;
        if (index >= lineElements.length) {
            clearInterval(visualPoemTimer);
            visualPoemTimer = null;
            return;
        }
        highlightPoemLine(lineElements, index);
    }, perf.isMobile ? 3200 : 2600);
}

function runSpeechQueue(items, lineElements, token) {
    const synth = window.speechSynthesis;
    if (!synth || !items.length) {
        runVisualPoemScroll(lineElements, token);
        return;
    }

    let index = 0;
    const speakNext = () => {
        if (token !== speechQueueToken || index >= items.length) return;

        const item = items[index++];
        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.volume = item.silent ? 0 : 1;
        if (item.silent) utterance.rate = item.rate || 3;
        else utterance.rate = perf.isMobile ? 0.92 : 1;

        utterance.onstart = () => {
            if (!item.silent && item.lineIndex != null) {
                highlightPoemLine(lineElements, item.lineIndex);
            }
        };
        utterance.onend = speakNext;
        utterance.onerror = speakNext;

        activeUtterances.push(utterance);
        synth.speak(utterance);
    };

    speakNext();
}

function speakSingularity(poemText) {
    cancelSingularitySpeech();
    const token = speechQueueToken;

    const container = document.getElementById('poem-container');
    if (!container) return;
    container.innerHTML = ''; 
    
    // --- FORCE THE CONTAINER ON-SCREEN ---
    container.style.position = 'absolute'; 
    container.style.zIndex = '9999'; 
    container.style.pointerEvents = 'none'; 
    container.style.top = '15%'; 
    container.style.left = '50%'; 
    container.style.transform = 'translateX(-50%)'; 
    container.style.width = '80vw'; 
    container.style.height = '70vh'; 
    container.style.overflowY = 'hidden'; 
    container.style.display = 'block';
    container.style.color = 'var(--neon-green)'; 

    const lines = poemText.split('\n').filter(line => line.trim() !== '');
    const lineElements = [];

    const topSpacer = document.createElement('div');
    topSpacer.style.height = '35vh';
    container.appendChild(topSpacer);

    lines.forEach((line) => {
        const span = document.createElement('span'); 
        span.className = 'poem-line'; 
        span.innerText = line;
        span.style.display = 'block'; 
        span.style.opacity = '0.1'; 
        span.style.transition = 'opacity 0.4s ease, text-shadow 0.4s ease, color 0.4s ease';
        span.style.margin = '20px 0'; 
        span.style.textAlign = 'center';
        container.appendChild(span);
        lineElements.push(span);
    });

    const bottomSpacer = document.createElement('div');
    bottomSpacer.style.height = '35vh';
    container.appendChild(bottomSpacer);

    const items = buildSpeechItems(lines);
    const startSpeech = () => runSpeechQueue(items, lineElements, token);

    if (document.body.classList.contains('ios-ui')) {
        runVisualPoemScroll(lineElements, token);
        return;
    }

    setTimeout(startSpeech, 50);
}

function cyclePoem() {
    const nextBtn = document.getElementById('next-poem-btn');
    
    // Prevent spam-clicking while the sound is playing
    if (nextBtn.disabled) return;
    
    // Temporarily lock the button and give visual feedback
    nextBtn.disabled = true;
    nextBtn.style.opacity = '0.5';
    nextBtn.innerText = '[ DECODING... ]';

    // 1. Check if the AI is actively talking BEFORE we cancel it
    const wasInterrupted = window.speechSynthesis?.speaking || window.speechSynthesis?.pending;
    
    // 2. Immediately shut the current voice up
    cancelSingularitySpeech();
    
    // 3. Choose the right sound
    const activeSound = wasInterrupted ? sfx.clearThroat : sfx.transition;
    
    // 4. Play the sound
    playSound(activeSound);

    // 5. Wait for the exact moment the sound finishes playing
    activeSound.onended = () => {
        const pool = activeSingularityPoems();
        setCurrentPoemIndex((currentPoemIndex + 1) % pool.length);
        speakSingularity(pool[currentPoemIndex]);
        pushTerminalLog("> NEXT TRANSMISSION DECODED.");
        
        // Unlock the button so the user can click it again
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.innerText = '[NEXT TRANSMISSION]';
        
        // Clean up the listener so it doesn't fire twice later
        activeSound.onended = null;
    };
}



function handle3DStart(e) {
    isDragging3D = true;
    lastMouseX = e.clientX || e.touches[0].clientX;
    lastMouseY = e.clientY || e.touches[0].clientY;
}
function handle3DMove(e) {
    if (isDragging3D) {
        let cx = e.clientX || e.touches[0].clientX;
        let cy = e.clientY || e.touches[0].clientY;
        angleY += (cx - lastMouseX) * 0.01;
        angleX += (cy - lastMouseY) * 0.01;
        lastMouseX = cx;
        lastMouseY = cy;
    }
}
function handle3DEnd() { isDragging3D = false; }

bindSingularityCanvas();

export { triggerSingularity, triggerOspreyEvent, cyclePoem, init3D, stopSingularity3D };
