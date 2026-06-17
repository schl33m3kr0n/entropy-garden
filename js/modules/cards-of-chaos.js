import { sfx, playSound } from '../core/shared.js';
import {
    ROUND_COUNT,
    MAX_SWAPS,
    HAND_SIZE,
    SUITS,
    HAND_LABELS,
    RULES_SECTIONS,
    buildDeck,
    allCardTemplates,
    cardKey,
    dieSidesForSuit,
    rollDie,
    dieMedian,
    isSpecialFace,
    hexWedgeFaceSvg,
    sierpinskiFaceSvg,
    icosaCornerSvg,
    isDieSixFace,
    isDieNineFace,
} from '../data/cards-of-chaos.data.js';

const HAND_RANK = {
    ROYAL_FLUSH: 9,
    STRAIGHT_FLUSH: 8,
    FOUR_KIND: 7,
    FULL_HOUSE: 6,
    FLUSH: 5,
    STRAIGHT: 4,
    THREE_KIND: 3,
    TWO_PAIR: 2,
    ONE_PAIR: 1,
    HIGH_CARD: 0,
};

const SWAP_ANIM_MS = 520;
const DIE_SPIN_MS = 580;
const DIE_REVEAL_MS = 720;
const DIE_BETWEEN_MS = 420;

let rootEl;
let bound = false;
let game = null;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function cloneCard(card) {
    return { ...card };
}

function deckTop(state) {
    return state.deck.length ? state.deck[state.deck.length - 1] : null;
}

function evaluateFixedFive(cards) {
    const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
    const rankFreq = new Map();
    for (const c of cards) {
        rankFreq.set(c.rank, (rankFreq.get(c.rank) || 0) + 1);
    }

    const suit = cards[0].suit;
    const isFlush = cards.every((c) => c.suit === suit);
    const uniq = [...new Set(ranks)].sort((a, b) => a - b);
    let isStraight = false;
    let straightHigh = 0;
    if (uniq.length === 5 && uniq[4] - uniq[0] === 4) {
        isStraight = true;
        straightHigh = uniq[4];
    }

    const counts = [...rankFreq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const topCount = counts[0][1];
    const topRank = counts[0][0];
    const secondCount = counts[1]?.[1] ?? 0;
    const secondRank = counts[1]?.[0] ?? 0;

    if (isFlush && isStraight && suit === 'hex' && straightHigh === 20 && uniq[0] === 16) {
        return {
            type: 'ROYAL_FLUSH',
            rank: HAND_RANK.ROYAL_FLUSH,
            suit: 'hex',
            straightHigh,
            topRank: 20,
            meta: { ranks: uniq },
        };
    }
    if (isFlush && isStraight) {
        return {
            type: 'STRAIGHT_FLUSH',
            rank: HAND_RANK.STRAIGHT_FLUSH,
            suit,
            straightHigh,
            topRank: straightHigh,
            meta: { ranks: uniq },
        };
    }
    if (topCount === 4) {
        const quadRank = counts[0][0];
        return {
            type: 'FOUR_KIND',
            rank: HAND_RANK.FOUR_KIND,
            suit: cards.find((c) => c.rank === quadRank)?.suit ?? suit,
            topRank: quadRank,
            meta: { quadRank },
        };
    }
    if (topCount === 3 && secondCount === 2) {
        return {
            type: 'FULL_HOUSE',
            rank: HAND_RANK.FULL_HOUSE,
            suit: cards.find((c) => c.rank === topRank)?.suit,
            topRank,
            meta: {
                tripleSuit: cards.find((c) => c.rank === topRank)?.suit,
                pairSuit: cards.find((c) => c.rank === secondRank)?.suit,
                tripleRank: topRank,
                pairRank: secondRank,
            },
        };
    }
    if (isFlush) {
        return {
            type: 'FLUSH',
            rank: HAND_RANK.FLUSH,
            suit,
            topRank: ranks[0],
            meta: { ranks },
        };
    }
    if (isStraight) {
        const highCard = cards.find((c) => c.rank === straightHigh) ?? cards[0];
        return {
            type: 'STRAIGHT',
            rank: HAND_RANK.STRAIGHT,
            suit: highCard.suit,
            straightHigh,
            topRank: straightHigh,
            meta: { ranks: uniq },
        };
    }
    if (topCount === 3) {
        return {
            type: 'THREE_KIND',
            rank: HAND_RANK.THREE_KIND,
            suit: cards.find((c) => c.rank === topRank)?.suit,
            topRank,
            meta: { tripleRank: topRank },
        };
    }
    if (topCount === 2 && secondCount === 2) {
        const highPair = Math.max(topRank, secondRank);
        const lowPair = Math.min(topRank, secondRank);
        return {
            type: 'TWO_PAIR',
            rank: HAND_RANK.TWO_PAIR,
            suit: cards.find((c) => c.rank === highPair)?.suit,
            topRank: highPair,
            meta: {
                highPair,
                lowPair,
                highPairSuit: cards.find((c) => c.rank === highPair)?.suit,
                lowPairSuit: cards.find((c) => c.rank === lowPair)?.suit,
            },
        };
    }
    if (topCount === 2) {
        return {
            type: 'ONE_PAIR',
            rank: HAND_RANK.ONE_PAIR,
            suit: cards.find((c) => c.rank === topRank)?.suit,
            topRank,
            meta: { pairRank: topRank },
        };
    }
    const high = cards.reduce((best, c) => (c.rank > best.rank ? c : best), cards[0]);
    return {
        type: 'HIGH_CARD',
        rank: HAND_RANK.HIGH_CARD,
        suit: high.suit,
        topRank: high.rank,
        meta: { highRank: high.rank },
    };
}

function expandWildAssignments(cards) {
    const fixed = cards.filter((c) => c.suit !== 'wild');
    const wilds = cards.filter((c) => c.suit === 'wild');
    if (wilds.length === 0) return [cards];

    const used = new Set(fixed.map(cardKey));
    const templates = allCardTemplates();
    const results = [];

    function recurse(idx, assigned) {
        if (idx === wilds.length) {
            results.push([...fixed, ...assigned]);
            return;
        }
        for (const t of templates) {
            const key = cardKey(t);
            if (used.has(key)) continue;
            used.add(key);
            recurse(idx + 1, [...assigned, { ...t, uid: `wild-as-${key}-${idx}` }]);
            used.delete(key);
        }
    }

    recurse(0, []);
    return results.length ? results : [cards];
}

function evaluateHand(cards) {
    let best = null;
    let bestAssignment = cards;

    for (const assignment of expandWildAssignments(cards)) {
        const ev = evaluateFixedFive(assignment);
        if (!best || ev.rank > best.rank || (ev.rank === best.rank && ev.topRank > best.topRank)) {
            best = ev;
            bestAssignment = assignment;
        }
    }

    const nonWild = cards.filter((c) => c.suit !== 'wild');
    const naturalOnly = nonWild.length === HAND_SIZE ? evaluateFixedFive(nonWild) : { rank: -1 };
    const wildUsed = cards.some((c) => c.suit === 'wild') && best.rank > naturalOnly.rank;

    return {
        ...best,
        label: HAND_LABELS[best.type],
        assignment: bestAssignment,
        wildUsed,
        wildSuit: wildUsed ? best.suit : null,
    };
}

function makeRoll(sides, suitId, role = 'primary') {
    const value = rollDie(sides);
    return {
        sides,
        suitId,
        value,
        role,
        label: SUITS[suitId]?.dieLabel || `d${sides}`,
        kept: null,
        revealed: false,
        spinning: false,
    };
}

function buildScoreResolution(handEval) {
    const { type, suit, meta, wildUsed, wildSuit } = handEval;
    const rolls = [];
    let value = 0;
    let note = '';

    switch (type) {
        case 'ROYAL_FLUSH': {
            const r1 = makeRoll(20, 'hex');
            const r2 = makeRoll(20, 'hex');
            rolls.push(r1, r2);
            r1.kept = r1.value >= r2.value;
            r2.kept = r2.value > r1.value;
            value = Math.max(r1.value, r2.value);
            note = `d20×2 → ${r1.value}, ${r2.value}`;
            break;
        }
        case 'STRAIGHT_FLUSH': {
            const r = makeRoll(dieSidesForSuit(suit), suit);
            rolls.push(r);
            r.kept = true;
            value = r.value;
            note = `${SUITS[suit].dieLabel} → ${r.value}`;
            break;
        }
        case 'FOUR_KIND': {
            const r = makeRoll(dieSidesForSuit(suit), suit);
            rolls.push(r);
            r.kept = true;
            value = r.value + 2;
            note = `${SUITS[suit].dieLabel} ${r.value} +2`;
            break;
        }
        case 'FULL_HOUSE': {
            const r1 = makeRoll(dieSidesForSuit(meta.tripleSuit), meta.tripleSuit);
            const r2 = makeRoll(dieSidesForSuit(meta.pairSuit), meta.pairSuit);
            rolls.push(r1, r2);
            r1.kept = true;
            r2.kept = true;
            value = r1.value + r2.value;
            note = `${SUITS[meta.tripleSuit].dieLabel}+${SUITS[meta.pairSuit].dieLabel} → ${r1.value}+${r2.value}`;
            break;
        }
        case 'FLUSH': {
            const r1 = makeRoll(dieSidesForSuit(suit), suit);
            const r2 = makeRoll(dieSidesForSuit(suit), suit);
            rolls.push(r1, r2);
            const low = Math.min(r1.value, r2.value);
            r1.kept = r1.value === low;
            r2.kept = r2.value === low;
            if (r1.value === r2.value) {
                r1.kept = true;
                r2.kept = true;
            }
            value = low;
            note = `${SUITS[suit].dieLabel}×2 low → ${r1.value}, ${r2.value}`;
            break;
        }
        case 'STRAIGHT': {
            const r = makeRoll(8, 'dia');
            rolls.push(r);
            r.kept = true;
            value = r.value;
            note = `d8 → ${r.value}`;
            break;
        }
        case 'THREE_KIND': {
            const r = makeRoll(dieSidesForSuit(suit), suit);
            rolls.push(r);
            r.kept = true;
            value = r.value;
            note = `${SUITS[suit].dieLabel} → ${r.value}`;
            break;
        }
        case 'TWO_PAIR': {
            const r1 = makeRoll(dieSidesForSuit(meta.highPairSuit), meta.highPairSuit);
            const r2 = makeRoll(dieSidesForSuit(meta.lowPairSuit), meta.lowPairSuit);
            rolls.push(r1, r2);
            r1.kept = r1.value >= r2.value;
            r2.kept = r2.value > r1.value;
            if (r1.value === r2.value) {
                r1.kept = true;
                r2.kept = true;
            }
            value = Math.max(r1.value, r2.value);
            note = `max(${SUITS[meta.highPairSuit].dieLabel}, ${SUITS[meta.lowPairSuit].dieLabel}) → ${value}`;
            break;
        }
        case 'ONE_PAIR': {
            const r = makeRoll(dieSidesForSuit(suit), suit);
            rolls.push(r);
            r.kept = true;
            value = Math.ceil(r.value / 2);
            note = `${SUITS[suit].dieLabel} ${r.value} ÷2↑ → ${value}`;
            break;
        }
        default: {
            const r = makeRoll(4, 'tri');
            rolls.push(r);
            r.kept = true;
            value = r.value;
            note = `d4 → ${r.value}`;
        }
    }

    if (wildUsed) {
        const wildDieSuit = wildSuit || suit;
        const sides = dieSidesForSuit(wildDieSuit);
        const wr = makeRoll(sides, wildDieSuit, 'wild');
        rolls.push(wr);
        const med = dieMedian(sides);
        wr.wildMedian = med;
        if (wr.value <= Math.floor(med)) {
            wr.kept = false;
            wr.wildFail = true;
            note += ` · wild ${wr.value} ≤ median → 0`;
            value = 0;
        } else {
            wr.kept = true;
            const doubled = value * 2;
            note += ` · wild ${wr.value} > median → ×2 (${value}→${doubled})`;
            value = doubled;
        }
    } else {
        for (const r of rolls) {
            if (r.kept === null) r.kept = true;
        }
    }

    return { finalValue: value, note, rolls, handLabel: handEval.label };
}

function shapeSvg(suitId, variant) {
    if (suitId === 'wild') {
        const fill = variant === 'white' ? '#f8f8f8' : '#111';
        const stroke = variant === 'white' ? '#333' : '#888';
        return `<svg viewBox="0 0 24 24" class="coc-shape coc-shape-circle" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/></svg>`;
    }
    const s = SUITS[suitId];
    if (suitId === 'tri') {
        return `<svg viewBox="0 0 24 24" class="coc-shape" aria-hidden="true"><polygon points="12,4 20,20 4,20" fill="${s.color}"/></svg>`;
    }
    if (suitId === 'sq') {
        return `<svg viewBox="0 0 24 24" class="coc-shape" aria-hidden="true"><rect x="5" y="5" width="14" height="14" fill="${s.color}"/></svg>`;
    }
    if (suitId === 'dia') {
        return `<svg viewBox="0 0 24 24" class="coc-shape" aria-hidden="true"><polygon points="12,3 21,12 12,21 3,12" fill="${s.color}"/></svg>`;
    }
    if (suitId === 'pent') {
        return `<svg viewBox="0 0 24 24" class="coc-shape" aria-hidden="true"><polygon points="12,2 22,9 18,21 6,21 2,9" fill="${s.color}"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" class="coc-shape" aria-hidden="true"><polygon points="12,2 18,8 20,16 14,22 10,22 4,16 6,8" fill="${s.color}"/></svg>`;
}

function dieCornerShapeSvg(suitId) {
    if (suitId === 'hex') {
        return icosaCornerSvg('--die-accent');
    }
    return shapeSvg(suitId);
}

function dieFaceMarkup(roll, showValue) {
    if (!showValue) return `<span class="coc-die-value">?</span>`;
    if (isDieSixFace(roll)) {
        return `<span class="coc-die-art coc-hex-wedge-art">${hexWedgeFaceSvg('--die-accent')}</span>`;
    }
    if (isDieNineFace(roll)) {
        return `<span class="coc-die-art coc-sierpinski-art">${sierpinskiFaceSvg('--die-accent')}</span>`;
    }
    return `<span class="coc-die-value">${roll.value}</span>`;
}

function renderDieEl(roll) {
    const el = document.createElement('div');
    el.className = 'coc-die';
    if (roll.spinning) el.classList.add('is-spinning');
    if (roll.revealed) el.classList.add('is-revealed');
    if (roll.kept === true) el.classList.add('is-kept');
    if (roll.kept === false) el.classList.add('is-dropped');
    if (roll.role === 'wild') el.classList.add('is-wild');

    const accent = SUITS[roll.suitId]?.color || '#ccc';
    const showValue = roll.revealed && !roll.spinning;

    el.innerHTML = `
        <div class="coc-die-body" style="--die-accent: ${accent}">
            ${dieFaceMarkup(roll, showValue)}
            ${dieCornerShapeSvg(roll.suitId)}
        </div>
        <span class="coc-die-tag">${roll.label}${roll.role === 'wild' ? ' · wild' : ''}</span>
    `;
    return el;
}

function specialFaceMarkup(card) {
    const special = isSpecialFace(card);
    if (special === 'hexWedge') {
        return `<span class="coc-special-art coc-hex-wedge-art">${hexWedgeFaceSvg('--coc-accent')}</span>`;
    }
    if (special === 'sierpinski') {
        return `<span class="coc-special-art coc-sierpinski-art">${sierpinskiFaceSvg('--coc-accent')}</span>`;
    }
    return '';
}

function renderCardEl(card, { faceDown = false, selectable = false, selected = false, swapAnim = null, onClick } = {}) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'coc-card';
    if (faceDown) el.classList.add('is-back');
    if (selectable) el.classList.add('is-selectable');
    if (selected) el.classList.add('is-selected');
    if (swapAnim === 'out') el.classList.add('is-swap-out');
    if (swapAnim === 'in') el.classList.add('is-swap-in');
    if (swapAnim === 'target') el.classList.add('is-swap-target');
    el.dataset.uid = card.uid;

    if (faceDown) {
        el.innerHTML = '<span class="coc-card-back">◈</span>';
        el.disabled = true;
        return el;
    }

    const special = isSpecialFace(card);
    if (special) el.classList.add('has-special-face');
    const rankLabel = card.suit === 'wild' ? '★' : (special ? '' : String(card.rank));
    el.innerHTML = `
        ${shapeSvg(card.suit, card.variant)}
        <span class="coc-rank">${rankLabel}</span>
        ${specialFaceMarkup(card)}
    `;
    el.style.setProperty('--coc-accent', SUITS[card.suit]?.accent || '#ccc');

    if (onClick) el.addEventListener('click', () => onClick(card, el));
    return el;
}

function cpuSwapDecision(hand, deck) {
    if (!deck.length) return -1;
    const evalBefore = evaluateHand(hand);
    let worstIdx = 0;
    let worstScore = Infinity;
    for (let i = 0; i < hand.length; i++) {
        const trial = [...hand];
        trial[i] = deck[deck.length - 1];
        const ev = evaluateHand(trial);
        const score = ev.rank * 100 + ev.topRank;
        if (score < worstScore) {
            worstScore = score;
            worstIdx = i;
        }
    }
    const trial = [...hand];
    trial[worstIdx] = deck[deck.length - 1];
    const after = evaluateHand(trial);
    if (after.rank > evalBefore.rank
        || (after.rank === evalBefore.rank && after.topRank > evalBefore.topRank)) {
        return worstIdx;
    }
    return Math.random() < 0.35 ? worstIdx : -1;
}

function planCpuSwaps(state) {
    const deck = [...state.deck];
    const hand = state.cpuHand.map(cloneCard);
    const planned = [];
    let swapsLeft = MAX_SWAPS;

    while (swapsLeft > 0 && deck.length) {
        const idx = cpuSwapDecision(hand, deck);
        if (idx < 0) break;
        const drawn = deck.pop();
        const out = hand[idx];
        planned.push({ handIdx: idx, out: cloneCard(out), in: cloneCard(drawn) });
        hand[idx] = drawn;
        deck.unshift(out);
        swapsLeft--;
    }
    return planned;
}

function applyCpuSwap(state, handIdx) {
    const drawn = state.deck.pop();
    const out = state.cpuHand[handIdx];
    state.cpuHand[handIdx] = drawn;
    state.deck.unshift(out);
}

function newGameState() {
    return {
        round: 1,
        swapsLeft: MAX_SWAPS,
        phase: 'swap',
        deck: shuffle(buildDeck()),
        playerHand: [],
        cpuHand: [],
        playerTotal: 0,
        cpuTotal: 0,
        selectedIdx: null,
        log: ['> Deal the chaos. Three swaps per round.'],
        suddenDeath: false,
        busy: false,
        cpuHighlightIdx: null,
        cpuSwapAnim: null,
        cpuSwapCount: 0,
        diceAnim: null,
    };
}

function dealRound(state) {
    state.playerHand = [];
    state.cpuHand = [];
    for (let i = 0; i < HAND_SIZE; i++) {
        state.playerHand.push(cloneCard(state.deck.pop()));
        state.cpuHand.push(cloneCard(state.deck.pop()));
    }
    state.swapsLeft = MAX_SWAPS;
    state.phase = 'swap';
    state.selectedIdx = null;
    state.suddenDeath = false;
    state.busy = false;
    state.cpuHighlightIdx = null;
    state.cpuSwapAnim = null;
    state.diceAnim = null;
    state.log.unshift(`> Round ${state.round} — ${MAX_SWAPS} swaps remaining.`);
}

async function animateDiceRolls(sideLabel, resolution) {
    const rolls = resolution.rolls.map((r) => ({ ...r, revealed: false, spinning: false }));
    game.diceAnim = {
        sideLabel,
        handLabel: resolution.handLabel,
        rolls,
        finalValue: resolution.finalValue,
        note: resolution.note,
        done: false,
    };
    renderGame();

    for (let i = 0; i < rolls.length; i++) {
        rolls[i].spinning = true;
        game.diceAnim.activeIdx = i;
        renderGame();
        playSound(sfx.loading);
        await delay(DIE_SPIN_MS);

        rolls[i].spinning = false;
        rolls[i].revealed = true;
        renderGame();
        playSound(sfx.click);
        await delay(DIE_REVEAL_MS);

        if (i < rolls.length - 1) await delay(DIE_BETWEEN_MS);
    }

    game.diceAnim.done = true;
    renderGame();
    await delay(900);
}

async function animateCpuSwaps(state) {
    const planned = planCpuSwaps(state);
    state.phase = 'cpu-swapping';
    state.log.unshift(`> CPU swapping${planned.length ? ` (${planned.length})` : ''}…`);
    renderGame();

    if (!planned.length) {
        await delay(400);
        return;
    }

    for (let i = 0; i < planned.length; i++) {
        const { handIdx } = planned[i];
        state.cpuHighlightIdx = handIdx;
        state.cpuSwapAnim = 'target';
        state.cpuSwapCount = i + 1;
        renderGame();
        await delay(320);

        state.cpuSwapAnim = 'out';
        renderGame();
        playSound(sfx.click);
        await delay(SWAP_ANIM_MS);

        applyCpuSwap(state, handIdx);
        state.cpuSwapAnim = 'in';
        renderGame();
        playSound(sfx.collectible);
        await delay(SWAP_ANIM_MS);

        state.log.unshift(`> CPU swapped slot ${handIdx + 1} for ${cardKey(state.cpuHand[handIdx])}.`);
    }

    state.cpuHighlightIdx = null;
    state.cpuSwapAnim = null;
    renderGame();
    await delay(350);
}

async function beginRevealSequence(state) {
    if (state.busy) return;
    state.busy = true;
    state.selectedIdx = null;

    await animateCpuSwaps(state);

    const showHands = true;
    state.phase = 'dice-roll';
    state.showCpuHand = showHands;
    renderGame();

    const pEval = evaluateHand(state.playerHand);
    const cEval = evaluateHand(state.cpuHand);
    const pRes = buildScoreResolution(pEval);
    const cRes = buildScoreResolution(cEval);

    await animateDiceRolls('You', { ...pRes, handLabel: pEval.label });
    await animateDiceRolls('CPU', { ...cRes, handLabel: cEval.label });

    state.playerTotal += pRes.finalValue;
    state.cpuTotal += cRes.finalValue;
    state.phase = 'reveal';
    state.diceAnim = null;
    state.lastReveal = {
        player: { eval: pEval, score: pRes },
        cpu: { eval: cEval, score: cRes },
    };
    state.log.unshift(
        `> You: ${pEval.label} → ${pRes.finalValue} (${pRes.note})`,
        `> CPU: ${cEval.label} → ${cRes.finalValue} (${cRes.note})`,
    );
    playSound(sfx.collectible);
    state.busy = false;
    renderGame();
}

function finishRound(state) {
    if (state.round >= ROUND_COUNT) {
        if (state.playerTotal === state.cpuTotal) {
            state.phase = 'sudden-death';
            state.suddenDeath = true;
            state.log.unshift('> Tied after four rounds. Sudden-death d20.');
        } else {
            state.phase = 'game-over';
            const win = state.playerTotal > state.cpuTotal;
            state.log.unshift(win ? '> You win the chaos.' : '> CPU wins the chaos.');
            if (win) globalThis.unlockTrophy?.('cards_chaos');
        }
        return;
    }
    state.round += 1;
    dealRound(state);
}

async function suddenDeathRoll(state) {
    if (state.busy) return;
    state.busy = true;

    const pRoll = makeRoll(20, 'hex');
    const cRoll = makeRoll(20, 'hex');
    pRoll.kept = true;
    cRoll.kept = true;

    await animateDiceRolls('You — sudden death', {
        handLabel: 'Sudden death d20',
        rolls: [pRoll],
        finalValue: pRoll.value,
        note: `d20 → ${pRoll.value}`,
    });
    await animateDiceRolls('CPU — sudden death', {
        handLabel: 'Sudden death d20',
        rolls: [cRoll],
        finalValue: cRoll.value,
        note: `d20 → ${cRoll.value}`,
    });

    state.lastReveal = { suddenDeath: { player: pRoll.value, cpu: cRoll.value } };
    if (pRoll.value === cRoll.value) {
        state.log.unshift(`> Sudden death tie (${pRoll.value}). Roll again.`);
        state.busy = false;
        state.diceAnim = null;
        renderGame();
        return;
    }

    state.phase = 'game-over';
    state.suddenDeath = false;
    state.diceAnim = null;
    const win = pRoll.value > cRoll.value;
    state.log.unshift(`> Sudden death: You ${pRoll.value} — CPU ${cRoll.value}. ${win ? 'You win.' : 'CPU wins.'}`);
    if (win) globalThis.unlockTrophy?.('cards_chaos');
    state.busy = false;
    renderGame();
}

function swapPlayerCard(state, handIdx) {
    if (state.phase !== 'swap' || state.busy || state.swapsLeft <= 0 || !state.deck.length) return;
    const drawn = state.deck.pop();
    const out = state.playerHand[handIdx];
    state.playerHand[handIdx] = drawn;
    state.deck.unshift(out);
    state.swapsLeft -= 1;
    state.selectedIdx = null;
    state.log.unshift(`> Swapped ${cardKey(out)} for ${cardKey(drawn)}. ${state.swapsLeft} swaps left.`);
    playSound(sfx.click);
    renderGame();
    if (state.swapsLeft === 0) beginRevealSequence(state);
}

function renderRules(panel) {
    panel.innerHTML = RULES_SECTIONS.map(
        (s) => `<section class="coc-rules-block"><h3>${s.title}</h3><p>${s.body.replace(/\n/g, '<br>')}</p></section>`,
    ).join('');
}

function renderDiceArena() {
    const arena = rootEl?.querySelector('#coc-dice-arena');
    if (!arena) return;

    const anim = game?.diceAnim;
    if (!anim || (game.phase !== 'dice-roll' && !anim.done)) {
        arena.hidden = true;
        arena.innerHTML = '';
        return;
    }

    arena.hidden = false;
    const diceRow = document.createElement('div');
    diceRow.className = 'coc-dice-row';
    for (const roll of anim.rolls) {
        diceRow.appendChild(renderDieEl(roll));
    }

    arena.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'coc-dice-head';
    head.innerHTML = `
        <span class="coc-dice-side">${anim.sideLabel}</span>
        <span class="coc-dice-hand">${anim.handLabel}</span>
    `;
    arena.append(head, diceRow);

    if (anim.done) {
        const foot = document.createElement('p');
        foot.className = 'coc-dice-result';
        foot.textContent = `Round score: ${anim.finalValue} · ${anim.note}`;
        arena.appendChild(foot);
    }
}

function renderGame() {
    if (!rootEl || !game) return;

    const statusEl = rootEl.querySelector('#coc-status');
    const playerHandEl = rootEl.querySelector('#coc-player-hand');
    const cpuHandEl = rootEl.querySelector('#coc-cpu-hand');
    const deckEl = rootEl.querySelector('#coc-deck-count');
    const deckTopEl = rootEl.querySelector('#coc-deck-top');
    const logEl = rootEl.querySelector('#coc-log');
    const actionsEl = rootEl.querySelector('#coc-actions');
    const totalsEl = rootEl.querySelector('#coc-totals');

    const phaseLabel = {
        'cpu-swapping': `Round ${game.round} — CPU swapping (${game.cpuSwapCount || 0}/${MAX_SWAPS})`,
        'dice-roll': `Round ${game.round} — rolling dice`,
        reveal: `Round ${game.round} — revealed`,
        'game-over': 'Game over',
        'sudden-death': 'Sudden death — roll d20',
    };

    statusEl.textContent = game.suddenDeath && game.phase !== 'dice-roll'
        ? 'Sudden death — roll d20'
        : phaseLabel[game.phase] || `Round ${game.round} of ${ROUND_COUNT} · ${game.swapsLeft} swaps left`;

    totalsEl.innerHTML = `
        <span>You: <strong>${game.playerTotal}</strong></span>
        <span>CPU: <strong>${game.cpuTotal}</strong></span>
    `;

    deckEl.textContent = String(game.deck.length);

    if (deckTopEl) {
        deckTopEl.innerHTML = '';
        const top = deckTop(game);
        const showTop = game.phase === 'cpu-swapping' && top;
        if (showTop) {
            deckTopEl.appendChild(renderCardEl(top, { faceDown: false }));
            deckTopEl.hidden = false;
        } else {
            deckTopEl.hidden = true;
        }
    }

    playerHandEl.innerHTML = '';
    const canSwap = game.phase === 'swap' && !game.busy && game.swapsLeft > 0 && game.deck.length > 0;
    game.playerHand.forEach((card, idx) => {
        playerHandEl.appendChild(renderCardEl(card, {
            selectable: canSwap,
            selected: game.selectedIdx === idx,
            onClick: canSwap
                ? () => {
                    if (game.selectedIdx === idx) {
                        swapPlayerCard(game, idx);
                    } else {
                        game.selectedIdx = idx;
                        renderGame();
                    }
                }
                : null,
        }));
    });

    cpuHandEl.innerHTML = '';
    const cpuFaceUp = game.phase === 'cpu-swapping' || game.phase === 'dice-roll' || game.phase === 'reveal'
        || game.phase === 'game-over' || game.phase === 'sudden-death';
    game.cpuHand.forEach((card, idx) => {
        let swapAnim = null;
        if (game.phase === 'cpu-swapping' && idx === game.cpuHighlightIdx) {
            swapAnim = game.cpuSwapAnim || 'target';
        }
        cpuHandEl.appendChild(renderCardEl(card, {
            faceDown: !cpuFaceUp,
            swapAnim,
        }));
    });

    renderDiceArena();

    logEl.innerHTML = game.log.slice(0, 10).map((line) => `<p>${line}</p>`).join('');

    actionsEl.innerHTML = '';
    const mkBtn = (label, fn, primary = false) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `singularity-btn${primary ? ' coc-btn-primary' : ''}`;
        b.textContent = label;
        b.disabled = !!game.busy;
        b.addEventListener('click', fn);
        return b;
    };

    if (game.phase === 'swap' && game.swapsLeft > 0 && !game.busy) {
        actionsEl.appendChild(mkBtn('Reveal early', () => beginRevealSequence(game)));
        if (game.selectedIdx !== null) {
            actionsEl.appendChild(mkBtn('Swap selected', () => swapPlayerCard(game, game.selectedIdx), true));
        }
    }
    if (game.phase === 'reveal' && !game.busy) {
        actionsEl.appendChild(mkBtn('Next round', () => {
            finishRound(game);
            renderGame();
        }, true));
    }
    if (game.phase === 'sudden-death' && !game.busy) {
        actionsEl.appendChild(mkBtn('Roll d20', () => suddenDeathRoll(game), true));
    }
    if (game.phase === 'game-over' && !game.busy) {
        actionsEl.appendChild(mkBtn('New game', () => {
            game = newGameState();
            dealRound(game);
            renderGame();
        }, true));
    }
}

function buildShell(container) {
    container.innerHTML = `
        <div class="coc-layout">
            <nav class="coc-tabs" role="tablist">
                <button type="button" class="coc-tab is-active" data-tab="play" role="tab">Play</button>
                <button type="button" class="coc-tab" data-tab="rules" role="tab">Rules</button>
            </nav>
            <div class="coc-panel coc-panel-play is-active" data-panel="play">
                <div class="coc-header">
                    <p id="coc-status" class="coc-status"></p>
                    <div id="coc-totals" class="coc-totals"></div>
                </div>
                <div class="coc-table">
                    <div class="coc-row coc-row-cpu">
                        <span class="coc-label">CPU</span>
                        <div id="coc-cpu-hand" class="coc-hand"></div>
                    </div>
                    <div class="coc-row coc-row-deck">
                        <span class="coc-label">Deck</span>
                        <div class="coc-deck-stack">
                            <div id="coc-deck-top" class="coc-deck-top" hidden></div>
                            <div class="coc-deck-pile"><span id="coc-deck-count">0</span></div>
                        </div>
                    </div>
                    <div class="coc-row coc-row-player">
                        <span class="coc-label">You</span>
                        <div id="coc-player-hand" class="coc-hand"></div>
                    </div>
                </div>
                <div id="coc-dice-arena" class="coc-dice-arena" hidden></div>
                <p class="coc-hint">Tap a card twice to swap it with the deck top. Max ${MAX_SWAPS} swaps, then reveal.</p>
                <div id="coc-actions" class="coc-actions"></div>
                <div id="coc-log" class="coc-log scrollable-content"></div>
            </div>
            <div class="coc-panel coc-panel-rules" data-panel="rules" hidden>
                <div id="coc-rules-body" class="coc-rules scrollable-content"></div>
            </div>
        </div>
    `;

    renderRules(container.querySelector('#coc-rules-body'));

    container.querySelectorAll('.coc-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            const id = tab.dataset.tab;
            container.querySelectorAll('.coc-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === id));
            container.querySelectorAll('.coc-panel').forEach((p) => {
                const on = p.dataset.panel === id;
                p.classList.toggle('is-active', on);
                p.hidden = !on;
            });
        });
    });
}

export function initCardsOfChaos() {
    rootEl = document.getElementById('cards-game-container');
    if (!rootEl) return;

    if (!bound) {
        buildShell(rootEl);
        bound = true;
    }

    game = newGameState();
    dealRound(game);
    renderGame();
}
