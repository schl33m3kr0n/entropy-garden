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

let rootEl;
let bound = false;
let game = null;

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

function rollHandScore(handEval) {
    const { type, suit, meta, wildUsed, wildSuit } = handEval;
    const rolls = [];
    let value = 0;
    let note = '';

    switch (type) {
        case 'ROYAL_FLUSH': {
            const r1 = rollDie(20);
            const r2 = rollDie(20);
            rolls.push(r1, r2);
            value = Math.max(r1, r2);
            note = `d20×2 → ${r1}, ${r2}`;
            break;
        }
        case 'STRAIGHT_FLUSH': {
            const sides = dieSidesForSuit(suit);
            value = rollDie(sides);
            rolls.push(value);
            note = `${SUITS[suit].dieLabel} → ${value}`;
            break;
        }
        case 'FOUR_KIND': {
            const sides = dieSidesForSuit(suit);
            const r = rollDie(sides);
            rolls.push(r);
            value = r + 2;
            note = `${SUITS[suit].dieLabel} ${r} +2`;
            break;
        }
        case 'FULL_HOUSE': {
            const r1 = rollDie(dieSidesForSuit(meta.tripleSuit));
            const r2 = rollDie(dieSidesForSuit(meta.pairSuit));
            rolls.push(r1, r2);
            value = r1 + r2;
            note = `${SUITS[meta.tripleSuit].dieLabel}+${SUITS[meta.pairSuit].dieLabel} → ${r1}+${r2}`;
            break;
        }
        case 'FLUSH': {
            const sides = dieSidesForSuit(suit);
            const r1 = rollDie(sides);
            const r2 = rollDie(sides);
            rolls.push(r1, r2);
            value = Math.min(r1, r2);
            note = `${SUITS[suit].dieLabel}×2 low → ${r1}, ${r2}`;
            break;
        }
        case 'STRAIGHT': {
            value = rollDie(8);
            rolls.push(value);
            note = `d8 → ${value}`;
            break;
        }
        case 'THREE_KIND': {
            value = rollDie(dieSidesForSuit(suit));
            rolls.push(value);
            note = `${SUITS[suit].dieLabel} → ${value}`;
            break;
        }
        case 'TWO_PAIR': {
            const r1 = rollDie(dieSidesForSuit(meta.highPairSuit));
            const r2 = rollDie(dieSidesForSuit(meta.lowPairSuit));
            rolls.push(r1, r2);
            value = Math.max(r1, r2);
            note = `max(${SUITS[meta.highPairSuit].dieLabel}, ${SUITS[meta.lowPairSuit].dieLabel}) → ${value}`;
            break;
        }
        case 'ONE_PAIR': {
            const r = rollDie(dieSidesForSuit(suit));
            rolls.push(r);
            value = Math.ceil(r / 2);
            note = `${SUITS[suit].dieLabel} ${r} ÷2↑ → ${value}`;
            break;
        }
        default: {
            value = rollDie(4);
            rolls.push(value);
            note = `d4 → ${value}`;
        }
    }

    if (wildUsed) {
        const wildDieSuit = wildSuit || suit;
        const sides = dieSidesForSuit(wildDieSuit);
        const wr = rollDie(sides);
        rolls.push(wr);
        const med = dieMedian(sides);
        if (wr <= Math.floor(med)) {
            note += ` · wild ${wr} ≤ median → 0`;
            value = 0;
        } else {
            const doubled = value * 2;
            note += ` · wild ${wr} > median → ×2 (${value}→${doubled})`;
            value = doubled;
        }
    }

    return { value, rolls, note };
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

function specialFaceMarkup(card) {
    const special = isSpecialFace(card);
    if (special === 'cube') return '<span class="coc-special coc-cube" aria-hidden="true"></span>';
    if (special === 'sierpinski') return '<span class="coc-special coc-sierpinski" aria-hidden="true"></span>';
    return '';
}

function renderCardEl(card, { faceDown = false, selectable = false, selected = false, onClick } = {}) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'coc-card';
    if (faceDown) el.classList.add('is-back');
    if (selectable) el.classList.add('is-selectable');
    if (selected) el.classList.add('is-selected');
    el.dataset.uid = card.uid;

    if (faceDown) {
        el.innerHTML = '<span class="coc-card-back">◈</span>';
        el.disabled = true;
        return el;
    }

    const rankLabel = card.suit === 'wild' ? '★' : String(card.rank);
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
        trial[i] = deck[0];
        const ev = evaluateHand(trial);
        const score = ev.rank * 100 + ev.topRank;
        if (score < worstScore) {
            worstScore = score;
            worstIdx = i;
        }
    }
    const trial = [...hand];
    trial[worstIdx] = deck[0];
    const after = evaluateHand(trial);
    if (after.rank > evalBefore.rank
        || (after.rank === evalBefore.rank && after.topRank > evalBefore.topRank)) {
        return worstIdx;
    }
    return Math.random() < 0.35 ? worstIdx : -1;
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
    state.log.unshift(`> Round ${state.round} — ${MAX_SWAPS} swaps remaining.`);
}

function cpuPerformSwaps(state) {
    let swaps = MAX_SWAPS;
    while (swaps > 0 && state.deck.length) {
        const idx = cpuSwapDecision(state.cpuHand, state.deck);
        if (idx < 0) break;
        const drawn = state.deck.pop();
        const discarded = state.cpuHand[idx];
        state.cpuHand[idx] = drawn;
        state.deck.unshift(discarded);
        swaps--;
    }
}

function resolveRound(state) {
    cpuPerformSwaps(state);
    const pEval = evaluateHand(state.playerHand);
    const cEval = evaluateHand(state.cpuHand);
    const pScore = rollHandScore(pEval);
    const cScore = rollHandScore(cEval);
    state.playerTotal += pScore.value;
    state.cpuTotal += cScore.value;
    state.phase = 'reveal';
    state.lastReveal = {
        player: { eval: pEval, score: pScore },
        cpu: { eval: cEval, score: cScore },
    };
    state.log.unshift(
        `> You: ${pEval.label} → ${pScore.value} (${pScore.note})`,
        `> CPU: ${cEval.label} → ${cScore.value} (${cScore.note})`,
    );
    playSound(sfx.collectible);
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

function suddenDeathRoll(state) {
    const p = rollDie(20);
    const c = rollDie(20);
    state.lastReveal = { suddenDeath: { player: p, cpu: c } };
    if (p === c) {
        state.log.unshift(`> Sudden death tie (${p}). Roll again.`);
        return;
    }
    state.phase = 'game-over';
    state.suddenDeath = false;
    const win = p > c;
    state.log.unshift(`> Sudden death: You ${p} — CPU ${c}. ${win ? 'You win.' : 'CPU wins.'}`);
    if (win) globalThis.unlockTrophy?.('cards_chaos');
}

function swapPlayerCard(state, handIdx) {
    if (state.phase !== 'swap' || state.swapsLeft <= 0 || !state.deck.length) return;
    const drawn = state.deck.pop();
    const out = state.playerHand[handIdx];
    state.playerHand[handIdx] = drawn;
    state.deck.unshift(out);
    state.swapsLeft -= 1;
    state.selectedIdx = null;
    state.log.unshift(`> Swapped ${cardKey(out)} for ${cardKey(drawn)}. ${state.swapsLeft} swaps left.`);
    playSound(sfx.click);
    if (state.swapsLeft === 0) resolveRound(state);
}

function renderRules(panel) {
    panel.innerHTML = RULES_SECTIONS.map(
        (s) => `<section class="coc-rules-block"><h3>${s.title}</h3><p>${s.body.replace(/\n/g, '<br>')}</p></section>`,
    ).join('');
}

function renderGame() {
    if (!rootEl || !game) return;

    const statusEl = rootEl.querySelector('#coc-status');
    const playerHandEl = rootEl.querySelector('#coc-player-hand');
    const cpuHandEl = rootEl.querySelector('#coc-cpu-hand');
    const deckEl = rootEl.querySelector('#coc-deck-count');
    const logEl = rootEl.querySelector('#coc-log');
    const actionsEl = rootEl.querySelector('#coc-actions');
    const totalsEl = rootEl.querySelector('#coc-totals');

    statusEl.textContent = game.suddenDeath
        ? 'Sudden death — roll d20'
        : game.phase === 'game-over'
            ? 'Game over'
            : game.phase === 'reveal'
                ? `Round ${game.round} — revealed`
                : `Round ${game.round} of ${ROUND_COUNT} · ${game.swapsLeft} swaps left`;

    totalsEl.innerHTML = `
        <span>You: <strong>${game.playerTotal}</strong></span>
        <span>CPU: <strong>${game.cpuTotal}</strong></span>
    `;

    deckEl.textContent = String(game.deck.length);

    playerHandEl.innerHTML = '';
    game.playerHand.forEach((card, idx) => {
        const selectable = game.phase === 'swap' && game.swapsLeft > 0 && game.deck.length > 0;
        playerHandEl.appendChild(renderCardEl(card, {
            selectable,
            selected: game.selectedIdx === idx,
            onClick: selectable
                ? () => {
                    if (game.selectedIdx === idx) {
                        swapPlayerCard(game, idx);
                        renderGame();
                    } else {
                        game.selectedIdx = idx;
                        renderGame();
                    }
                }
                : null,
        }));
    });

    cpuHandEl.innerHTML = '';
    const showCpu = game.phase === 'reveal' || game.phase === 'game-over' || game.phase === 'sudden-death';
    game.cpuHand.forEach((card) => {
        cpuHandEl.appendChild(renderCardEl(card, { faceDown: !showCpu }));
    });

    logEl.innerHTML = game.log.slice(0, 8).map((line) => `<p>${line}</p>`).join('');

    actionsEl.innerHTML = '';
    const mkBtn = (label, fn, primary = false) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `singularity-btn${primary ? ' coc-btn-primary' : ''}`;
        b.textContent = label;
        b.addEventListener('click', fn);
        return b;
    };

    if (game.phase === 'swap' && game.swapsLeft > 0) {
        actionsEl.appendChild(mkBtn('Reveal early', () => {
            resolveRound(game);
            renderGame();
        }));
        if (game.selectedIdx !== null) {
            actionsEl.appendChild(mkBtn('Swap selected', () => {
                swapPlayerCard(game, game.selectedIdx);
                renderGame();
            }, true));
        }
    }
    if (game.phase === 'reveal') {
        actionsEl.appendChild(mkBtn('Next round', () => {
            finishRound(game);
            renderGame();
        }, true));
    }
    if (game.phase === 'sudden-death') {
        actionsEl.appendChild(mkBtn('Roll d20', () => {
            suddenDeathRoll(game);
            renderGame();
        }, true));
    }
    if (game.phase === 'game-over') {
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
                        <div class="coc-deck-pile"><span id="coc-deck-count">0</span></div>
                    </div>
                    <div class="coc-row coc-row-player">
                        <span class="coc-label">You</span>
                        <div id="coc-player-hand" class="coc-hand"></div>
                    </div>
                </div>
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
