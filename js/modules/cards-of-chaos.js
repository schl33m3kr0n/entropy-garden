import { sfx, playSound, perf } from '../core/shared.js';
import {
    ROUND_COUNT,
    MAX_SWAPS,
    HAND_SIZE,
    MIN_PLAYERS,
    MAX_PLAYERS,
    SUITS,
    HAND_LABELS,
    RULES_SECTIONS,
    buildDeck,
    allCardTemplates,
    cardKey,
    dieSidesForSuit,
    rollDie,
    dieMedian,
    hexWedgeFaceSvg,
    sierpinskiFaceSvg,
    icosaCornerSvg,
    icosahedronShapeSvg,
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
const ANNOUNCE_IN_MS = 680;
const ANNOUNCE_HOLD_MS = 1500;
const ANNOUNCE_OUT_MS = 520;
const SWAP_FLASH_IN_MS = 380;
const SWAP_FLASH_HOLD_MS = 820;
const SWAP_FLASH_OUT_MS = 360;

/** Seat names for CPU opponents by total player count (human is always south). */
const OPPONENT_SEATS = {
    2: ['north'],
    3: ['west', 'east'],
    4: ['north', 'west', 'east'],
};

/** Card dimensions tuned per table shape (uniform within each table). */
const TABLE_METRICS = {
    2: { w: 50, h: 68, gap: 6, shape: 28 },
    3: { w: 50, h: 68, gap: 6, shape: 28 },
    4: { w: 44, h: 60, gap: 4, shape: 24 },
};

let rootEl;
let bound = false;
let keyboardBound = false;
let game = null;

function cocTouchPrimary() {
    return perf.isIOS || document.body.classList.contains('ios-ui');
}

function cocKeyboardActive() {
    if (!rootEl?.isConnected || !game) return false;
    const modal = document.getElementById('modal-cards');
    if (!modal) return true;
    return getComputedStyle(modal).display !== 'none';
}

function isCoCTypingTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    return !!el.closest?.('.terminal-container');
}

function onCoCKeydown(e) {
    if (e.code !== 'Space' && e.key !== ' ') return;
    if (!cocKeyboardActive() || cocTouchPrimary()) return;
    if (isCoCTypingTarget(e.target)) return;
    const action = getCocPrimaryAction();
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();
    action.fn();
}

function getCocPrimaryAction(state = game) {
    if (!state || state.busy) return null;
    if (state.phase === 'swap') {
        return {
            label: state.swapsLeft > 0 ? 'Reveal early' : 'Reveal',
            fn: () => revealEarly(state),
        };
    }
    if (state.phase === 'reveal') {
        return { label: 'Next round', fn: () => finishRound(state) };
    }
    return null;
}

function bindCoCKeyboard() {
    if (keyboardBound) return;
    keyboardBound = true;
    document.addEventListener('keydown', onCoCKeydown, true);
}

function renderTouchPrimary(slotEl, action) {
    if (!slotEl) return;
    slotEl.innerHTML = '';
    slotEl.hidden = !action;
    if (!action) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'singularity-btn coc-btn-primary coc-touch-primary-btn';
    btn.textContent = action.label;
    btn.disabled = !!game?.busy;
    btn.addEventListener('click', action.fn);
    slotEl.appendChild(btn);
    slotEl.hidden = false;
}

function ensureSpaceHint() {
    let hintEl = rootEl?.querySelector('#coc-space-hint');
    if (!hintEl && rootEl) {
        hintEl = document.createElement('div');
        hintEl.id = 'coc-space-hint';
        hintEl.className = 'coc-space-hint';
        hintEl.hidden = true;
        hintEl.setAttribute('aria-live', 'polite');
    }
    return hintEl;
}

function mountSpaceHint() {
    const hintEl = ensureSpaceHint();
    if (!hintEl || !game) return;

    const isBottom = game.playerCount === 2;
    hintEl.classList.toggle('coc-space-hint--bottom', isBottom);
    hintEl.classList.toggle('coc-space-hint--seat', !isBottom);

    if (isBottom) {
        const slot = rootEl?.querySelector('#coc-space-hint-slot');
        if (slot && hintEl.parentElement !== slot) slot.appendChild(hintEl);
        return;
    }

    const inner = rootEl?.querySelector('.coc-seat[data-seat="south"] .coc-seat-inner');
    if (inner && hintEl.parentElement !== inner) {
        inner.insertBefore(hintEl, inner.firstChild);
    }
}

function renderSpaceHint() {
    mountSpaceHint();
    const hintEl = rootEl?.querySelector('#coc-space-hint');
    if (!hintEl) return;
    const action = getCocPrimaryAction();
    const show = !cocTouchPrimary() && action && cocKeyboardActive();
    if (!show) {
        hintEl.hidden = true;
        hintEl.classList.remove('is-visible');
        hintEl.innerHTML = '';
        return;
    }
    hintEl.hidden = false;
    hintEl.classList.add('is-visible');
    hintEl.innerHTML = `
        <span class="coc-space-key" aria-hidden="true">space</span>
        <span class="coc-space-label">${action.label}</span>
    `;
}

function renderPrimaryControls() {
    const action = getCocPrimaryAction();
    const slot2p = rootEl?.querySelector('#coc-touch-primary-2p');
    const slotCorner = rootEl?.querySelector('#coc-touch-primary-corner');

    if (cocTouchPrimary()) {
        if (game.playerCount === 2) {
            renderTouchPrimary(slot2p, action);
            if (slotCorner) {
                slotCorner.innerHTML = '';
                slotCorner.hidden = true;
            }
        } else {
            renderTouchPrimary(slotCorner, action);
            if (slot2p) {
                slot2p.innerHTML = '';
                slot2p.hidden = true;
            }
        }
        renderSpaceHint();
        return;
    }

    if (slot2p) {
        slot2p.innerHTML = '';
        slot2p.hidden = true;
    }
    if (slotCorner) {
        slotCorner.innerHTML = '';
        slotCorner.hidden = true;
    }
    renderSpaceHint();
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyTableMetrics(playerCount) {
    const surface = rootEl?.querySelector('.coc-table-surface');
    const metrics = TABLE_METRICS[playerCount] || TABLE_METRICS[2];
    if (!surface) return;
    surface.style.setProperty('--coc-card-w', `${metrics.w}px`);
    surface.style.setProperty('--coc-card-h', `${metrics.h}px`);
    surface.style.setProperty('--coc-card-gap', `${metrics.gap}px`);
    surface.style.setProperty('--coc-shape-size', `${metrics.shape}px`);
}

async function showAnnouncement(text, subtext = '') {
    if (!game) return;
    game.announcement = { text, subtext, phase: 'in' };
    renderGame();
    await delay(ANNOUNCE_IN_MS);
    game.announcement.phase = 'hold';
    renderGame();
    await delay(ANNOUNCE_HOLD_MS);
    game.announcement.phase = 'out';
    renderGame();
    await delay(ANNOUNCE_OUT_MS);
    game.announcement = null;
    renderGame();
}

async function pulseSwapFlash(text, subtext = '') {
    if (!game) return;
    game.swapFlash = { text, subtext, phase: 'in' };
    renderGame();
    await delay(SWAP_FLASH_IN_MS);
    game.swapFlash.phase = 'hold';
    renderGame();
    await delay(SWAP_FLASH_HOLD_MS);
    game.swapFlash.phase = 'out';
    renderGame();
    await delay(SWAP_FLASH_OUT_MS);
    game.swapFlash = null;
    renderGame();
}

function opponentFaceUpFor(playerIndex) {
    if (!game) return false;
    const phase = game.phase;
    if (phase === 'dice-roll' || phase === 'reveal' || phase === 'game-over' || phase === 'sudden-death') {
        return true;
    }
    if (phase === 'cpu-swapping') {
        return game.activeCpuPlayerIdx === playerIndex
            || game.revealedOpponents.includes(playerIndex);
    }
    return false;
}

async function announceRoundStart(state) {
    state.busy = true;
    renderGame();
    await showAnnouncement(`Round ${state.round}`, `of ${ROUND_COUNT}`);
    state.busy = false;
    renderGame();
}

async function announceGameEnd(winner) {
    if (!game) return;
    game.busy = true;
    renderGame();
    const winText = winner.isHuman ? 'You win!' : `${winner.name} wins!`;
    await showAnnouncement(winText, `${winner.total} points`);
    await showAnnouncement('Game over');
    game.phase = 'game-over';
    if (winner.isHuman) globalThis.unlockTrophy?.('cards_chaos');
    game.busy = false;
    renderGame();
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

function playerLabel(playerIndex) {
    return `P${playerIndex + 1}`;
}

function playerCountOptionLabel(count) {
    return `${count}P`;
}

function makePlayers(playerCount) {
    const players = [];
    for (let i = 0; i < playerCount; i++) {
        players.push({
            id: i === 0 ? 'you' : `cpu-${i}`,
            name: playerLabel(i),
            isHuman: i === 0,
            hand: [],
            total: 0,
        });
    }
    return players;
}

function activeCpu(state) {
    const idx = state.activeCpuPlayerIdx;
    return idx != null ? state.players[idx] : null;
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
            if (r1.kept) r1.modBadge = { text: 'HIGH', kind: 'buff' };
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
            r.modBadge = { text: '+2', kind: 'buff' };
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
            if (r1.kept) r1.modBadge = { text: 'LOW', kind: 'low' };
            if (r2.kept && r1.value !== r2.value) r2.modBadge = { text: 'LOW', kind: 'low' };
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
            if (r1.kept) r1.modBadge = { text: 'MAX', kind: 'buff' };
            note = `max(${SUITS[meta.highPairSuit].dieLabel}, ${SUITS[meta.lowPairSuit].dieLabel}) → ${value}`;
            break;
        }
        case 'ONE_PAIR': {
            const r = makeRoll(dieSidesForSuit(suit), suit);
            rolls.push(r);
            r.kept = true;
            r.modBadge = { text: '÷2↑', kind: 'half' };
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
            wr.modBadge = { text: '0', kind: 'wild-zero' };
            note += ` · wild ${wr.value} ≤ median → 0`;
            value = 0;
        } else {
            wr.kept = true;
            const doubled = value * 2;
            wr.modBadge = { text: '2×', kind: 'wild-double' };
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
    if (suitId === 'hex') {
        return icosahedronShapeSvg(s.color);
    }
    return '';
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

function dieModBadgeMarkup(roll) {
    if (!roll.modBadge || roll.spinning || !roll.revealed) return '';
    const { text, kind } = roll.modBadge;
    return `<span class="coc-die-mod coc-die-mod-${kind}">${text}</span>`;
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
            ${dieModBadgeMarkup(roll)}
        </div>
        <span class="coc-die-tag">${roll.label}${roll.role === 'wild' ? ' · wild' : ''}</span>
    `;
    return el;
}

function cardFaceHtml(card) {
    if (!card?.suit) {
        return '<span class="coc-card-back">?</span>';
    }
    const rankLabel = card.suit === 'wild' ? '' : String(card.rank);
    const wideRank = rankLabel.length > 1 ? ' is-wide' : '';
    const centerShape = shapeSvg(card.suit, card.variant);
    return `
        <span class="coc-card-corner coc-card-corner-tl">
            <span class="coc-rank${wideRank}">${rankLabel}</span>
        </span>
        <span class="coc-card-center">${centerShape}</span>
        <span class="coc-card-corner coc-card-corner-br">
            <span class="coc-rank${wideRank}">${rankLabel}</span>
        </span>
    `;
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
    if (card?.uid) el.dataset.uid = card.uid;

    if (faceDown || !card?.suit) {
        el.innerHTML = '<span class="coc-card-back">◈</span>';
        el.disabled = true;
        return el;
    }

    const hint = selectable
        ? '<span class="coc-card-hint">Tap twice to swap</span>'
        : '';
    el.innerHTML = cardFaceHtml(card) + hint;
    el.style.setProperty('--coc-accent', SUITS[card.suit]?.accent || '#ccc');

    if (onClick) el.addEventListener('click', () => onClick(card, el));
    return el;
}

function handScore(hand) {
    const ev = evaluateHand(hand);
    return ev.rank * 1000 + ev.topRank;
}

function cpuSwapDecision(hand, deck) {
    if (!deck.length) return -1;
    const before = handScore(hand);
    let bestIdx = -1;
    let bestScore = before;
    for (let i = 0; i < hand.length; i++) {
        const trial = [...hand];
        trial[i] = deck[deck.length - 1];
        const score = handScore(trial);
        if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
        }
    }
    return bestIdx;
}

function planCpuSwaps(deck, hand) {
    const deckCopy = [...deck];
    const handCopy = hand.map(cloneCard);
    const planned = [];
    let swapsLeft = MAX_SWAPS;

    while (swapsLeft > 0 && deckCopy.length) {
        const idx = cpuSwapDecision(handCopy, deckCopy);
        if (idx < 0) break;
        const drawn = deckCopy.pop();
        const out = handCopy[idx];
        planned.push({ handIdx: idx, out: cloneCard(out), in: cloneCard(drawn) });
        handCopy[idx] = drawn;
        deckCopy.unshift(out);
        swapsLeft--;
    }
    return planned;
}

function applyCpuSwap(state, playerIdx, handIdx) {
    const hand = state.players[playerIdx].hand;
    const drawn = state.deck.pop();
    const out = hand[handIdx];
    hand[handIdx] = drawn;
    state.deck.unshift(out);
}

function newGameState(playerCount = MIN_PLAYERS) {
    const count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, playerCount));
    return {
        round: 1,
        swapsLeft: MAX_SWAPS,
        phase: 'swap',
        deck: shuffle(buildDeck()),
        playerCount: count,
        pendingPlayerCount: count,
        players: makePlayers(count),
        selectedIdx: null,
        log: ['> Deal the chaos. Three swaps per round.'],
        suddenDeath: false,
        suddenDeathPlayers: null,
        busy: false,
        activeCpuPlayerIdx: null,
        cpuHighlightIdx: null,
        cpuSwapAnim: null,
        cpuSwapCount: 0,
        diceAnim: null,
        announcement: null,
        swapFlash: null,
        revealedOpponents: [],
        cpuSwapPreview: null,
    };
}

function returnHandsToDeck(state) {
    for (const player of state.players) {
        for (const card of player.hand) {
            if (card?.suit) state.deck.push(cloneCard(card));
        }
        player.hand = [];
    }
}

function dealRound(state) {
    returnHandsToDeck(state);
    state.deck = shuffle(state.deck);

    const needed = state.players.length * HAND_SIZE;
    for (const player of state.players) {
        for (let i = 0; i < HAND_SIZE; i++) {
            if (!state.deck.length) {
                state.log.unshift(`> Deck exhausted — cannot deal ${needed} cards.`);
                break;
            }
            player.hand.push(cloneCard(state.deck.pop()));
        }
    }
    state.swapsLeft = MAX_SWAPS;
    state.phase = 'swap';
    state.selectedIdx = null;
    state.suddenDeath = false;
    state.suddenDeathPlayers = null;
    state.busy = false;
    state.activeCpuPlayerIdx = null;
    state.cpuHighlightIdx = null;
    state.cpuSwapAnim = null;
    state.diceAnim = null;
    state.revealedOpponents = [];
    state.cpuSwapPreview = null;
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
    state.phase = 'cpu-swapping';
    state.revealedOpponents = [];
    state.log.unshift('> Opponents swapping…');
    renderGame();

    for (let pi = 1; pi < state.players.length; pi++) {
        const player = state.players[pi];
        state.activeCpuPlayerIdx = pi;
        state.cpuSwapCount = 0;
        renderGame();
        await delay(420);

        let swapNum = 0;
        while (swapNum < MAX_SWAPS) {
            const handIdx = cpuSwapDecision(player.hand, state.deck);
            if (handIdx < 0) break;

            swapNum += 1;
            const incoming = cloneCard(state.deck[state.deck.length - 1]);
            if (swapNum === 1) {
                state.log.unshift(`> ${player.name} swapping…`);
            }

            state.cpuHighlightIdx = handIdx;
            state.cpuSwapAnim = 'target';
            state.cpuSwapCount = swapNum;
            state.cpuSwapPreview = { handIdx, incoming };
            renderGame();
            await delay(320);

            state.cpuSwapAnim = 'out';
            renderGame();
            playSound(sfx.click);
            await delay(SWAP_ANIM_MS);

            applyCpuSwap(state, pi, handIdx);
            state.cpuSwapAnim = 'in';
            state.cpuSwapPreview = null;
            renderGame();
            playSound(sfx.collectible);
            await delay(SWAP_ANIM_MS);

            state.cpuHighlightIdx = null;
            state.cpuSwapAnim = null;
            renderGame();

            state.log.unshift(`> ${player.name} swapped slot ${handIdx + 1} for ${cardKey(player.hand[handIdx])}.`);
            await pulseSwapFlash(player.name, `Swap ${swapNum} / ${MAX_SWAPS}`);
        }

        if (swapNum === 0) {
            state.log.unshift(`> ${player.name} passes.`);
        }

        state.cpuHighlightIdx = null;
        state.cpuSwapAnim = null;
        state.cpuSwapPreview = null;
        state.revealedOpponents.push(pi);
        renderGame();
        await delay(280);
    }

    state.activeCpuPlayerIdx = null;
    renderGame();
    await delay(350);
}

async function beginRevealSequence(state) {
    if (state.busy) return;
    state.busy = true;
    state.selectedIdx = null;

    await animateCpuSwaps(state);

    state.phase = 'dice-roll';
    renderGame();

    const revealResults = [];
    for (const player of state.players) {
        const ev = evaluateHand(player.hand);
        const res = buildScoreResolution(ev);
        await animateDiceRolls(player.name, { ...res, handLabel: ev.label });
        player.total += res.finalValue;
        revealResults.push({ name: player.name, eval: ev, score: res });
        state.log.unshift(`> ${player.name}: ${ev.label} → ${res.finalValue} (${res.note})`);
    }

    state.phase = 'reveal';
    state.diceAnim = null;
    state.lastReveal = { players: revealResults };
    playSound(sfx.collectible);
    state.busy = false;
    renderGame();
}

function finishRound(state) {
    if (state.round >= ROUND_COUNT) {
        const max = Math.max(...state.players.map((p) => p.total));
        const leaders = state.players.filter((p) => p.total === max);
        if (leaders.length > 1) {
            state.phase = 'sudden-death';
            state.suddenDeath = true;
            state.suddenDeathPlayers = leaders;
            state.log.unshift(`> Tied at ${max} pts (${leaders.length} players). Sudden-death d20.`);
        } else {
            const winner = leaders[0];
            state.log.unshift(winner.isHuman ? '> You win the chaos.' : `> ${winner.name} wins the chaos.`);
            state.busy = true;
            renderGame();
            void announceGameEnd(winner);
        }
        return;
    }
    void advanceToNextRound(state);
}

async function advanceToNextRound(state) {
    if (state.busy) return;
    state.round += 1;
    dealRound(state);
    renderGame();
    await announceRoundStart(state);
}

async function suddenDeathRoll(state) {
    if (state.busy) return;
    state.busy = true;

    const contenders = state.suddenDeathPlayers?.length
        ? state.suddenDeathPlayers
        : state.players.filter((p) => p.total === Math.max(...state.players.map((x) => x.total)));

    const rolls = [];
    for (const player of contenders) {
        const roll = makeRoll(20, 'hex');
        roll.kept = true;
        rolls.push({ player, roll });
        await animateDiceRolls(`${player.name} — sudden death`, {
            handLabel: 'Sudden death d20',
            rolls: [roll],
            finalValue: roll.value,
            note: `d20 → ${roll.value}`,
        });
    }

    const maxRoll = Math.max(...rolls.map((r) => r.roll.value));
    const winners = rolls.filter((r) => r.roll.value === maxRoll);

    state.lastReveal = {
        suddenDeath: rolls.map((r) => ({ name: r.player.name, value: r.roll.value })),
    };

    if (winners.length > 1) {
        state.suddenDeathPlayers = winners.map((w) => w.player);
        state.log.unshift(`> Sudden death tie at ${maxRoll}. Roll again.`);
        state.busy = false;
        state.diceAnim = null;
        renderGame();
        return;
    }

    const winner = winners[0].player;
    state.suddenDeath = false;
    state.suddenDeathPlayers = null;
    state.diceAnim = null;
    const summary = rolls.map((r) => `${r.player.name} ${r.roll.value}`).join(', ');
    state.log.unshift(`> Sudden death: ${summary}. ${winner.name} wins.`);
    renderGame();
    void announceGameEnd(winner);
}

function revealEarly(state) {
    if (state.phase !== 'swap' || state.busy) return;
    const unused = state.swapsLeft;
    state.swapsLeft = 0;
    state.selectedIdx = null;
    if (unused > 0) {
        state.log.unshift(`> Revealing early (${unused} swap${unused === 1 ? '' : 's'} unused). Opponents swap next.`);
    } else {
        state.log.unshift('> Revealing. Opponents swap next.');
    }
    renderGame();
    beginRevealSequence(state);
}

function swapPlayerCard(state, handIdx) {
    if (state.phase !== 'swap' || state.busy || state.swapsLeft <= 0 || !state.deck.length) return;
    const hand = state.players[0].hand;
    const drawn = state.deck.pop();
    const out = hand[handIdx];
    hand[handIdx] = drawn;
    state.deck.unshift(out);
    state.swapsLeft -= 1;
    state.selectedIdx = null;
    const swapNum = MAX_SWAPS - state.swapsLeft;
    state.log.unshift(`> Swapped ${cardKey(out)} for ${cardKey(drawn)}. ${state.swapsLeft} swaps left.`);
    playSound(sfx.click);
    renderGame();
    void pulseSwapFlash(`Swap ${swapNum} / ${MAX_SWAPS}`, state.swapsLeft ? `${state.swapsLeft} left` : 'Revealing…');
    if (state.swapsLeft === 0) beginRevealSequence(state);
}

function shouldShowPlayerPick(state) {
    if (state.phase === 'game-over') return true;
    return state.phase === 'swap'
        && state.round === 1
        && !state.busy
        && state.swapsLeft === MAX_SWAPS;
}

function renderPlayerPick(container) {
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'coc-player-pick';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Player count');

    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `coc-player-btn${game.pendingPlayerCount === n ? ' is-active' : ''}`;
        btn.textContent = playerCountOptionLabel(n);
        btn.setAttribute('aria-label', `${n} players`);
        btn.addEventListener('click', () => {
            if (game.pendingPlayerCount === n) return;
            game.pendingPlayerCount = n;
            if (shouldShowPlayerPick(game)) {
                game = newGameState(n);
                dealRound(game);
                renderGame();
                void announceRoundStart(game);
            }
            renderGame();
        });
        wrap.appendChild(btn);
    }

    container.appendChild(wrap);
}

function renderRules(panel) {
    panel.innerHTML = RULES_SECTIONS.map(
        (s) => `<section class="coc-rules-block"><h3>${s.title}</h3><p>${s.body.replace(/\n/g, '<br>')}</p></section>`,
    ).join('');
}

function resetSeats() {
    if (!rootEl) return;
    rootEl.querySelectorAll('.coc-seat').forEach((el) => {
        el.hidden = true;
        el.innerHTML = '';
        el.classList.remove('coc-seat--active-swap');
    });
}

function renderPlayerSeat(seatName, player, playerIndex, {
    faceUp = true,
    canSwap = false,
    selectedIdx = null,
    onCardClick = null,
    highlightIdx = null,
    swapAnim = null,
    activeSwap = false,
} = {}) {
    const seatEl = rootEl?.querySelector(`.coc-seat[data-seat="${seatName}"]`);
    if (!seatEl || !player) return;

    seatEl.hidden = false;
    seatEl.classList.toggle('coc-seat--active-swap', activeSwap);
    const isSide = seatName === 'west' || seatName === 'east';

    const inner = document.createElement('div');
    inner.className = `coc-seat-inner coc-seat-inner--${seatName}`;

    const label = document.createElement('span');
    label.className = 'coc-seat-label';
    label.innerHTML = `${player.name} <span class="coc-seat-score">${player.total}</span>`;

    const handWrap = document.createElement('div');
    handWrap.className = 'coc-hand-wrap';

    const handEl = document.createElement('div');
    handEl.className = `coc-hand${isSide ? ' coc-hand--vertical' : ''}`;

    player.hand.forEach((card, idx) => {
        let cardSwapAnim = null;
        if (highlightIdx === idx) {
            cardSwapAnim = swapAnim || 'target';
        }
        handEl.appendChild(renderCardEl(card, {
            faceDown: !faceUp,
            selectable: canSwap,
            selected: selectedIdx === idx,
            swapAnim: cardSwapAnim,
            onClick: onCardClick ? () => onCardClick(idx) : null,
        }));
    });

    handWrap.appendChild(handEl);
    inner.append(label, handWrap);
    seatEl.appendChild(inner);
}

function renderSwapFlash() {
    const el = rootEl?.querySelector('#coc-swap-flash');
    if (!el) return;
    const flash = game?.swapFlash;
    if (!flash) {
        el.hidden = true;
        el.innerHTML = '';
        el.className = 'coc-swap-flash';
        return;
    }
    el.hidden = false;
    el.className = `coc-swap-flash is-${flash.phase}`;
    el.innerHTML = `
        <span class="coc-swap-flash-title">${flash.text}</span>
        ${flash.subtext ? `<span class="coc-swap-flash-sub">${flash.subtext}</span>` : ''}
    `;
}

function renderAnnouncement() {
    const el = rootEl?.querySelector('#coc-announce');
    if (!el) return;
    const ann = game?.announcement;
    if (!ann) {
        el.hidden = true;
        el.innerHTML = '';
        el.className = 'coc-announce';
        return;
    }
    el.hidden = false;
    el.className = `coc-announce is-${ann.phase}`;
    el.innerHTML = `
        <div class="coc-announce-card">
            <span class="coc-announce-title">${ann.text}</span>
            ${ann.subtext ? `<span class="coc-announce-sub">${ann.subtext}</span>` : ''}
        </div>
    `;
}

function scoreResultHtml(anim) {
    const wildRoll = anim.rolls.find((r) => r.role === 'wild');
    const total = anim.finalValue;
    let totalClass = 'coc-score-total';
    let tag = '';

    if (wildRoll?.wildFail) {
        totalClass += ' is-zero';
        tag = '<span class="coc-score-tag is-fail">WILD BUST</span>';
    } else if (wildRoll && wildRoll.modBadge?.kind === 'wild-double') {
        totalClass += ' is-boost';
        tag = '<span class="coc-score-tag is-boost">DOUBLED</span>';
    }

    const detail = anim.note
        ? `<span class="coc-score-detail">${anim.note}</span>`
        : '';

    return `<span class="${totalClass}">${total}</span>${tag}${detail}`;
}

function renderDiceArena() {
    const overlay = rootEl?.querySelector('#coc-dice-overlay');
    if (!overlay) return;

    const anim = game?.diceAnim;
    if (!anim || (game.phase !== 'dice-roll' && !anim.done)) {
        overlay.hidden = true;
        overlay.classList.remove('is-visible');
        overlay.innerHTML = '';
        return;
    }

    overlay.hidden = false;
    overlay.classList.add('is-visible');

    const card = document.createElement('div');
    card.className = 'coc-dice-card';

    const head = document.createElement('div');
    head.className = 'coc-dice-head';
    head.innerHTML = `
        <span class="coc-dice-side">${anim.sideLabel}</span>
        <span class="coc-dice-hand">${anim.handLabel}</span>
    `;

    const diceRow = document.createElement('div');
    diceRow.className = 'coc-dice-row';
    for (const roll of anim.rolls) {
        diceRow.appendChild(renderDieEl(roll));
    }

    card.append(head, diceRow);

    if (anim.done) {
        const foot = document.createElement('p');
        foot.className = 'coc-dice-result';
        foot.innerHTML = scoreResultHtml(anim);
        card.appendChild(foot);
    }

    overlay.innerHTML = '';
    overlay.appendChild(card);
}

function renderGame() {
    if (!rootEl || !game) return;

    const deckEl = rootEl.querySelector('#coc-deck-count');
    const logPanelEl = rootEl.querySelector('#coc-log-panel');
    const actionsEl = rootEl.querySelector('#coc-actions');
    const playerPickEl = rootEl.querySelector('#coc-player-pick');

    deckEl.textContent = String(game.deck.length);

    const tableEl = rootEl.querySelector('#coc-table');
    const layoutEl = rootEl.querySelector('.coc-layout');
    if (tableEl) {
        tableEl.className = `coc-table coc-table--players-${game.playerCount}`;
    }
    if (layoutEl) {
        layoutEl.className = `coc-layout coc-layout--players-${game.playerCount}`;
    }
    applyTableMetrics(game.playerCount);

    resetSeats();

    const canSwapHuman = game.phase === 'swap' && !game.busy && game.swapsLeft > 0 && game.deck.length > 0;

    renderPlayerSeat('south', game.players[0], 0, {
        faceUp: true,
        canSwap: canSwapHuman,
        selectedIdx: game.selectedIdx,
        onCardClick: canSwapHuman
            ? (idx) => {
                if (game.selectedIdx === idx) {
                    swapPlayerCard(game, idx);
                } else {
                    game.selectedIdx = idx;
                    renderGame();
                }
            }
            : null,
    });

    const opponentSeats = OPPONENT_SEATS[game.playerCount] || [];
    for (let pi = 1; pi < game.players.length; pi++) {
        const seat = opponentSeats[pi - 1];
        if (!seat) continue;
        const isActiveCpu = game.phase === 'cpu-swapping' && game.activeCpuPlayerIdx === pi;
        renderPlayerSeat(seat, game.players[pi], pi, {
            faceUp: opponentFaceUpFor(pi),
            highlightIdx: isActiveCpu ? game.cpuHighlightIdx : null,
            swapAnim: isActiveCpu ? game.cpuSwapAnim : null,
            activeSwap: isActiveCpu,
        });
    }

    renderDiceArena();
    renderAnnouncement();
    renderSwapFlash();
    renderPrimaryControls();

    if (logPanelEl) {
        logPanelEl.innerHTML = game.log.map((line) => `<p>${line}</p>`).join('');
    }

    if (playerPickEl) {
        if (shouldShowPlayerPick(game)) {
            playerPickEl.hidden = false;
            renderPlayerPick(playerPickEl);
        } else {
            playerPickEl.hidden = true;
            playerPickEl.innerHTML = '';
        }
    }

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

    if (game.phase === 'swap' && !game.busy && game.selectedIdx !== null) {
        actionsEl.appendChild(mkBtn('Swap selected', () => swapPlayerCard(game, game.selectedIdx)));
    }
    if (game.phase === 'sudden-death' && !game.busy) {
        actionsEl.appendChild(mkBtn('Roll d20', () => suddenDeathRoll(game), true));
    }
    if (game.phase === 'game-over' && !game.busy) {
        actionsEl.appendChild(mkBtn('New game', () => {
            game = newGameState(game.pendingPlayerCount);
            dealRound(game);
            renderGame();
            void announceRoundStart(game);
        }, true));
    }
}

function buildShell(container) {
    container.innerHTML = `
        <div class="coc-layout">
            <nav class="coc-tabs" role="tablist">
                <button type="button" class="coc-tab is-active" data-tab="play" role="tab">Play</button>
                <button type="button" class="coc-tab" data-tab="rules" role="tab">Rules</button>
                <button type="button" class="coc-tab" data-tab="log" role="tab">Log</button>
            </nav>
            <div class="coc-panel coc-panel-play is-active" data-panel="play">
                <div id="coc-player-pick" class="coc-player-pick-wrap"></div>
                <div id="coc-table" class="coc-table coc-table--players-2">
                    <div class="coc-table-surface">
                        <div class="coc-seat" data-seat="north" hidden></div>
                        <div class="coc-seat" data-seat="north-west" hidden></div>
                        <div class="coc-seat" data-seat="north-east" hidden></div>
                        <div class="coc-seat" data-seat="west" hidden></div>
                        <div class="coc-seat" data-seat="east" hidden></div>
                        <div class="coc-seat" data-seat="south" hidden></div>
                        <div class="coc-table-center">
                            <div class="coc-deck-row">
                                <div class="coc-deck-cluster">
                                    <span class="coc-seat-label">Deck</span>
                                    <div class="coc-deck-pile"><span id="coc-deck-count">0</span></div>
                                </div>
                                <div id="coc-touch-primary-2p" class="coc-touch-primary-slot" hidden></div>
                            </div>
                            <div id="coc-swap-flash" class="coc-swap-flash" hidden></div>
                        </div>
                        <div id="coc-touch-primary-corner" class="coc-touch-primary-slot coc-touch-primary-slot--corner" hidden></div>
                        <div id="coc-announce" class="coc-announce" hidden></div>
                        <div id="coc-dice-overlay" class="coc-dice-overlay" hidden></div>
                    </div>
                </div>
                <div id="coc-space-hint-slot" class="coc-space-hint-slot"></div>
                <div id="coc-actions" class="coc-actions"></div>
            </div>
            <div class="coc-panel coc-panel-rules" data-panel="rules" hidden>
                <div id="coc-rules-body" class="coc-rules scrollable-content"></div>
            </div>
            <div class="coc-panel coc-panel-log" data-panel="log" hidden>
                <div id="coc-log-panel" class="coc-log coc-log-panel scrollable-content"></div>
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
    bindCoCKeyboard();

    game = newGameState();
    dealRound(game);
    renderGame();
    void announceRoundStart(game);
}
