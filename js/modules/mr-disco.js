/** Mr. Disco modal — disco ball with tracking eyes + alternate history archive. */

import { initDiscoBallEyes } from '../disco-ball-eyes.js';
import { initDiscoBallSpin } from '../disco-ball-spin.js';
import { initDashboard } from "./dashboard.js";
import { loadAlternateHistoryArticles } from '../data/alternate-history.data.js';
import { resolveAlternateHistoryArticles } from '../alternate-history-search.js';
import { playSound, sfx } from '../core/audio/sfx.js';

const ALT_HISTORY_SEEN_KEY = 'entropy-garden-alt-history-seen-v1';

/** @type {import('../data/alternate-history.data.js').AlternateHistoryArticle[]} */
let alternateHistoryArticles = [];
/** @type {Set<string>} */
let validArticleIds = new Set();

function loadSeenAlternateHistoryIds() {
    try {
        const raw = localStorage.getItem(ALT_HISTORY_SEEN_KEY);
        if (!raw) return new Set();
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return new Set();
        return new Set(arr.filter((id) => validArticleIds.has(id)));
    } catch {
        return new Set();
    }
}

function markAlternateHistorySeen(ids) {
    const seen = loadSeenAlternateHistoryIds();
    ids.forEach((id) => {
        if (validArticleIds.has(id)) seen.add(id);
    });
    try {
        localStorage.setItem(ALT_HISTORY_SEEN_KEY, JSON.stringify([...seen]));
    } catch {
        /* private mode / quota */
    }
    return seen;
}

function maybeUnlockAvidReaderTrophy(seen) {
    if (seen.size >= alternateHistoryArticles.length) {
        globalThis.unlockTrophy?.('avid_reader');
    }
}

const settings = {
    cx: 50,
    cy: 50,
    r: 42,
    checks: 12,
    tiltX: 0,
    speed: 0.75,
    strokeWidth: 1.5,
    fillDark: '#e6e6e6',
    chromaAmount: 0,
    chromaFalloff: 0.2,
    chromaAngle: 0,
    chromaOpacity: 0,
    chromaVariable: true,
    bgSpeed: 0.5,
    bgPhase: 243,
    reflectStrength: 0.5,
    specularStrength: 0,
    trailLength: 0,
    trailOpacity: 0.42,
    trailFade: 0.78,
    trailStep: 0.035,
    scleraR: 12.3,
    pupilR: 9.1,
    eyeY: 50,
    eyeSpread: 13.5,
    eyeStroke: 2,
    reach: 36,
    ease: 0.2,
};

let initPromise = null;

export function initMrDisco() {
    if (!initPromise) {
        initPromise = setup().catch((err) => {
            initPromise = null;
            throw err;
        });
    }
    return initPromise;
}

async function setup() {
    const host = document.getElementById('disco-host');
    if (!host) return;

    const svgText = await fetch('assets/icons/disco-ball.svg').then((r) => r.text());
    host.innerHTML = svgText;

    const svg = host.querySelector('svg');
    if (svg) {
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Disco ball with tracking eyes');
    }

    const spin = initDiscoBallSpin(host, { bgPhase: settings.bgPhase });
    const eyes = initDiscoBallEyes(host, { reach: settings.reach, ease: settings.ease });

    spin.setConfig({
        cx: settings.cx,
        cy: settings.cy,
        r: settings.r,
        checks: settings.checks,
        tiltX: settings.tiltX,
        speed: settings.speed,
        strokeWidth: settings.strokeWidth,
        fillDark: settings.fillDark,
        chromaAmount: settings.chromaAmount,
        chromaFalloff: settings.chromaFalloff,
        chromaAngle: settings.chromaAngle,
        chromaOpacity: settings.chromaOpacity,
        chromaVariable: settings.chromaVariable,
        bgSpeed: settings.bgSpeed,
        reflectStrength: settings.reflectStrength,
        specularStrength: settings.specularStrength,
        trailLength: settings.trailLength,
        trailOpacity: settings.trailOpacity,
        trailFade: settings.trailFade,
        trailStep: settings.trailStep,
    });
    spin.setBgPhase(settings.bgPhase);
    spin.setPaused(false);
    eyes.setLayout({
        scleraR: settings.scleraR,
        pupilR: settings.pupilR,
        eyeY: settings.eyeY,
        eyeLeftX: 50 - settings.eyeSpread,
        eyeRightX: 50 + settings.eyeSpread,
        strokeWidth: settings.eyeStroke,
    });
    eyes.setReach(settings.reach);
    eyes.setEase(settings.ease);

    try {
        alternateHistoryArticles = await loadAlternateHistoryArticles();
        validArticleIds = new Set(alternateHistoryArticles.map((article) => article.id));
    } catch (err) {
        console.error('[Entropy Garden] alternate history index failed', err);
        alternateHistoryArticles = [];
        validArticleIds = new Set();
    }

    const resultEl = document.getElementById('alt-history-result');
    const form = document.getElementById('alt-history-form');
    const queryInput = document.getElementById('alt-history-query');

    let lastAltHistoryIds = [];
    let searchLoadToken = 0;

    function revertEyesToTrack() {
        eyes.trackCursor();
    }

    function isArchiveOpen() {
        return Boolean(resultEl?.classList.contains('is-open'));
    }

    function finishArchiveClose() {
        if (!resultEl || isArchiveOpen()) return;
        resultEl.hidden = true;
        resultEl.innerHTML = '';
    }

    function closeArchiveDrawer() {
        if (!resultEl || !isArchiveOpen()) return;
        searchLoadToken += 1;
        resultEl.classList.remove('is-open');
        revertEyesToTrack();

        let finished = false;
        const finish = () => {
            if (finished || isArchiveOpen()) return;
            finished = true;
            resultEl.removeEventListener('transitionend', onTransitionEnd);
            finishArchiveClose();
        };
        const onTransitionEnd = (event) => {
            if (event.target !== resultEl) return;
            if (event.propertyName !== 'max-width' && event.propertyName !== 'max-height') return;
            finish();
        };

        resultEl.addEventListener('transitionend', onTransitionEnd);
        window.setTimeout(finish, 500);
    }

    function openArchiveDrawer({ onComplete, keepOpen = false } = {}) {
        if (!resultEl) return;
        resultEl.hidden = false;

        if (keepOpen && resultEl.classList.contains('is-open')) {
            onComplete?.();
            return;
        }

        resultEl.classList.remove('is-open');
        void resultEl.offsetWidth;

        if (!onComplete) {
            resultEl.classList.add('is-open');
            return;
        }

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            resultEl.removeEventListener('transitionend', onTransitionEnd);
            onComplete();
        };
        const onTransitionEnd = (event) => {
            if (event.target !== resultEl || event.propertyName !== 'max-width') return;
            finish();
        };

        resultEl.addEventListener('transitionend', onTransitionEnd);
        resultEl.classList.add('is-open');
        window.setTimeout(finish, 480);
    }

    function renderArticles({ articles, matchedBySearch, matchCount }, query = '', { onDrawerComplete } = {}) {
        if (!resultEl || !articles?.length) return;

        lastAltHistoryIds = articles.map((article) => article.id);
        maybeUnlockAvidReaderTrophy(markAlternateHistorySeen(lastAltHistoryIds));
        const note = matchedBySearch
            ? `${matchCount} timeline${matchCount === 1 ? '' : 's'} matched · showing ${articles.length}.`
            : query.trim()
                ? `No matches — ${articles.length} random divergences instead.`
                : `${articles.length} random divergences retrieved from the archive.`;

        const entries = articles.map((article) => `
            <article class="alt-history-entry">
                <p class="alt-history-meta">${article.year}</p>
                <h3>${article.title}</h3>
                <p class="alt-history-excerpt">${article.excerpt}</p>
                <p class="alt-history-tags">${article.tags.map((tag) => `#${tag}`).join(' ')}</p>
            </article>
        `).join('');

        resultEl.innerHTML = `
            <div class="alt-history-entries">${entries}</div>
            <p class="alt-history-note">${note}</p>
        `;
        const keepOpen = isArchiveOpen();
        if (keepOpen) resultEl.scrollTop = 0;
        openArchiveDrawer({ onComplete: onDrawerComplete, keepOpen });
    }

    async function showAlternateHistory(query = '', { randomOnly = false, googlyLeadIn = false } = {}) {
        const loadToken = googlyLeadIn ? ++searchLoadToken : searchLoadToken;

        if (googlyLeadIn) {
            eyes.playSilly('googly');
            await new Promise((resolve) => window.setTimeout(resolve, 360));
            if (loadToken !== searchLoadToken) return;
        }

        const resolved = resolveAlternateHistoryArticles(alternateHistoryArticles, {
            query: randomOnly ? '' : query,
            excludeIds: lastAltHistoryIds,
            count: 3,
        });

        renderArticles(resolved, query, {
            onDrawerComplete: googlyLeadIn
                ? () => {
                    if (loadToken !== searchLoadToken) return;
                    revertEyesToTrack();
                }
                : undefined,
        });
    }

    function activateEyeMode(mode) {
        if (!mode) return;
        if (mode === 'track') {
            eyes.trackCursor();
        } else {
            eyes.playSilly(mode);
        }
        if (mode === 'googly') {
            showAlternateHistory('', { randomOnly: true });
        }
    }

    const EYE_KEY_MODES = {
        0: 'sleepy',
        1: 'track',
        2: 'cross',
        3: 'spin',
        4: 'shifty',
        5: 'dizzy',
        6: 'heaven',
        7: 'googly',
        8: 'crossSign',
        9: 'sideEye'
    };

    function isMrDiscoModalOpen() {
        const modal = document.getElementById('modal-projects');
        return Boolean(modal && modal.style.display === 'block');
    }

    function shouldIgnoreEyeHotkey(event) {
        const target = event.target;
        if (!(target instanceof Element)) return false;
        if (target.closest('[contenteditable="true"]')) return true;
        return Boolean(target.closest('input, textarea, select'));
    }

    function isSpaceKey(event) {
        return event.key === ' ' || event.code === 'Space';
    }

    function isRKey(event) {
        return event.key === 'r' || event.key === 'R';
    }

    function shouldIgnoreArchiveHotkey(event) {
        const target = event.target;
        if (!(target instanceof Element)) return false;
        if (target.id === 'alt-history-query') return true;
        if (target.closest('[contenteditable="true"]')) return true;
        return Boolean(target.closest('input, textarea, select'));
    }

    function shouldIgnoreSpaceHotkey(event) {
        const target = event.target;
        if (!(target instanceof Element)) return false;
        if (target.id === 'alt-history-query') return true;
        if (target.closest('[contenteditable="true"]')) return true;

        const field = target.closest('input, textarea, select, button');
        if (!field) return false;

        if (field instanceof HTMLInputElement) {
            const type = (field.type || 'text').toLowerCase();
            return type !== 'submit' && type !== 'reset';
        }

        return true;
    }

    function requestRandomArchive() {
        showAlternateHistory('', {
            randomOnly: true,
            googlyLeadIn: !isArchiveOpen(),
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
        if (!isMrDiscoModalOpen()) return;

        if (isRKey(event) && !shouldIgnoreArchiveHotkey(event)) {
            event.preventDefault();
            event.stopPropagation();
            requestRandomArchive();
            return;
        }

        if (isSpaceKey(event) && !shouldIgnoreSpaceHotkey(event)) {
            event.preventDefault();
            event.stopPropagation();
            requestRandomArchive();
            return;
        }

        if (shouldIgnoreEyeHotkey(event)) return;

        if (event.key === '0') {
            event.preventDefault();
            event.stopPropagation();
            const stats = document.getElementById('mr-disco-stats-shell');
            if (stats) {
                stats.hidden = !stats.hidden;
                activateEyeMode(stats.hidden ? 'track' : 'sleepy');
                if (stats.hidden) closeDiscoStatsLightbox();
            } else {
                activateEyeMode('sleepy');
            }
            return;
        }

        const mode = EYE_KEY_MODES[event.key];
        if (!mode) return;
        event.preventDefault();
        event.stopPropagation();
        activateEyeMode(mode);
    }, true);

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        showAlternateHistory(queryInput?.value ?? '', { googlyLeadIn: true });
    });

    const stage = host.closest('.mr-disco-stage');
    stage?.addEventListener('click', (event) => {
        if (!document.body.classList.contains('ios-ui')) return;
        if (event.target.closest('input, button, a')) return;
        event.preventDefault();
        requestRandomArchive();
    });
    stage?.addEventListener('keydown', (event) => {
        if (!document.body.classList.contains('ios-ui')) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        requestRandomArchive();
    });

    document.getElementById('disco-stats-expand')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openDiscoStatsLightbox();
    });
    document.querySelector('#mr-disco-stats-shell .stats-text-grid')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openDiscoStatsLightbox();
    });

    initDashboard();
}


let statsChartInstance = null;
let instQ = null;
let inst1 = null;
let currentPieType = 'pie';
let currentTop1Type = 'share';
let currentRegion = 'us';

function statsLightboxMarkup() {
    const region = (id) => currentRegion === id ? ' active' : '';
    const pie = (id) => currentPieType === id ? ' active' : '';
    const top1 = (id) => currentTop1Type === id ? ' active' : '';
    return `
        <div class="stats-charts-wrapper">
            <div class="stats-chart-toolbar">
                <div class="chart-toggles">
                    <button type="button" class="ui-btn region-btn${region('us')}" data-region="us">US</button>
                    <button type="button" class="ui-btn region-btn${region('global')}" data-region="global">GLOBAL</button>
                </div>
                <div class="chart-toggles-rule"></div>
                <div class="chart-toggles">
                    <button type="button" class="ui-btn type-btn${pie('pie')}" data-type="pie">PIE</button>
                    <button type="button" class="ui-btn type-btn${pie('doughnut')}" data-type="doughnut">RING</button>
                    <button type="button" class="ui-btn type-btn${pie('bar')}" data-type="bar">BAR</button>
                </div>
            </div>
            <div class="stats-pies-row">
                <div class="stats-pie-cell">
                    <div class="stats-pie-caption">WEALTH QUINTILES</div>
                    <div class="stats-pie-canvas"><canvas id="chart-quintiles"></canvas></div>
                </div>
                <div class="stats-pie-cell">
                    <div class="stats-pie-caption">
                        <span>1% BREAKDOWN</span>
                        <div class="chart-toggles">
                            <button type="button" class="ui-btn top1-type-btn${top1('share')}" data-top1-type="share">SHARE</button>
                            <button type="button" class="ui-btn top1-type-btn${top1('income')}" data-top1-type="income">INCOME</button>
                        </div>
                    </div>
                    <div class="stats-pie-canvas"><canvas id="chart-top1"></canvas></div>
                </div>
            </div>
            <div class="stats-gdp-label">GLOBAL GDP — TOP 10 ECONOMIES</div>
            <div class="stats-pie-canvas stats-gdp-canvas">
                <canvas id="mr-disco-chart"></canvas>
            </div>
            <div class="stats-sources">
                Sources: Fed DFA Q4 2025 · IRS SOI · Census CPS ASEC 2024 · UBS Global Wealth Report 2025 · WID.world · Oxfam 2026 · IMF WEO Apr 2026
            </div>
        </div>
    `;
}

export function destroyDiscoStatsCharts() {
    statsChartInstance?.destroy();
    instQ?.destroy();
    inst1?.destroy();
    statsChartInstance = null;
    instQ = null;
    inst1 = null;
}

export function openDiscoStatsLightbox() {
    const overlay = document.getElementById('lightbox-overlay');
    if (!overlay) return;

    destroyDiscoStatsCharts();
    overlay.dataset.kind = 'disco-stats';
    overlay.innerHTML = '';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lightbox-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    overlay.appendChild(closeBtn);

    const panel = document.createElement('div');
    panel.className = 'lightbox-content stats-lightbox';
    panel.addEventListener('click', (event) => event.stopPropagation());
    panel.innerHTML = statsLightboxMarkup();
    overlay.appendChild(panel);

    overlay.classList.add('active');
    playSound(sfx.oneUp);
    window.setTimeout(renderStatsChart, 50);
}

export function closeDiscoStatsLightbox() {
    const overlay = document.getElementById('lightbox-overlay');
    if (overlay?.dataset.kind !== 'disco-stats' || !overlay.classList.contains('active')) return;
    overlay.classList.remove('active');
    playSound(sfx.exit);
    destroyDiscoStatsCharts();
    window.setTimeout(() => {
        if (overlay.dataset.kind !== 'disco-stats') return;
        overlay.innerHTML = '';
        delete overlay.dataset.kind;
    }, 300);
}

const wealthData = {
    // Sources: Fed DFA Q4 2025, IRS SOI, Census CPS ASEC 2024, Forbes Sep 2026
    us: {
        quintiles: [70, 14.5, 10, 3, 2.5],
        top1: [0.6, 4.4, 9, 18],
        top1Labels: ['#1 Musk ($892B)', 'Top 0.01% (~$30M+)', 'Top 0.1% (~$3.3M)', 'Top 1% (~$800K)'],
        top1BarLabels: ['#1 Musk', '0.01%', '0.1%', '1%'],
        top1Incomes: [892_000_000_000, 30_000_000, 3_300_000, 800_000],
        incomes: ['~$316K', '~$137K', '~$84K', '~$49K', '~$18K']
    },
    // Sources: UBS Global Wealth Report 2025, WID.world, Oxfam 2026, Forbes Sep 2026
    global: {
        quintiles: [85, 11, 3, 1, 0],
        top1: [0.2, 5.8, 14, 18],
        top1Labels: ['#1 Musk ($892B)', 'Top 0.01% (~$100M+)', 'Top 0.1% (~$10M)', 'Top 1% (~$1.2M)'],
        top1BarLabels: ['#1 Musk', '0.01%', '0.1%', '1%'],
        top1Incomes: [892_000_000_000, 100_000_000, 10_000_000, 1_200_000],
        incomes: ['~$50K+', '~$10K', '~$3K', '~$1K', '<$500']
    }
};

const top1Colors = ['#ffffff', '#ff0055', '#cc0044', '#990033'];

function formatUsdCompact(value) {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(value % 1e9 === 0 ? 0 : 1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(value % 1e6 === 0 ? 0 : 1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value}`;
}

const pctLabelPlugin = {
    id: 'pctLabels',
    afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((element, index) => {
                const val = dataset.data[index];
                if (val < 2) return;
                const pos = element.tooltipPosition();
                ctx.save();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(val + '%', pos.x, pos.y);
                ctx.restore();
            });
        });
    }
};

const INCOME_AXIS_STEP = 500_000_000;
const INCOME_AXIS_MAX = 5_000_000_000;

/** Marks bars whose value exceeds the capped INCOME axis as running off the chart. */
const offChartLabelPlugin = {
    id: 'offChartLabels',
    afterDatasetsDraw(chart) {
        const yScale = chart.scales.y;
        if (!yScale) return;
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((element, index) => {
                const val = dataset.data[index];
                if (val <= yScale.max) return;
                const lines = [`${formatUsdCompact(val)} \u2191`, 'off chart'];
                const top = chart.chartArea.top + 4;
                ctx.save();
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 8;
                ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
                ctx.fillRect(element.x - width / 2, top - 2, width, 24);
                ctx.fillStyle = '#ff0055';
                ctx.fillText(lines[0], element.x, top);
                ctx.fillText(lines[1], element.x, top + 10);
                ctx.restore();
            });
        });
    },
};

function chartFitOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 2, right: 8, bottom: 2, left: 4 } },
    };
}

function tooltipLine(label) {
    return {
        displayColors: false,
        callbacks: {
            title: () => '',
            label,
        },
    };
}

function buildTop1Chart(tCtx, d) {
    const isIncome = currentTop1Type === 'income';
    const type = isIncome ? 'bar' : currentPieType;
    const isBar = type === 'bar';
    const fit = chartFitOptions();
    return new window.Chart(tCtx, {
        type,
        data: {
            labels: isIncome || isBar ? d.top1BarLabels : d.top1Labels,
            datasets: [{
                data: isIncome ? d.top1Incomes : d.top1,
                backgroundColor: top1Colors,
                borderColor: 'var(--alert-red)',
                borderWidth: 1,
            }],
        },
        plugins: isIncome ? [offChartLabelPlugin] : [pctLabelPlugin],
        options: isBar ? {
            ...fit,
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: tooltipLine((ctx) => {
                    const value = isIncome ? formatUsdCompact(ctx.parsed.y) : `${ctx.parsed.y}% of total wealth`;
                    return `${ctx.label}: ${value}`;
                }),
            },
            scales: {
                y: isIncome ? {
                    beginAtZero: true,
                    min: 0,
                    max: INCOME_AXIS_MAX,
                    grid: { color: 'rgba(255, 80, 100, 0.12)' },
                    ticks: {
                        color: '#ff5588',
                        font: { size: 7 },
                        stepSize: INCOME_AXIS_STEP,
                        maxTicksLimit: INCOME_AXIS_MAX / INCOME_AXIS_STEP + 1,
                        callback: (v) => formatUsdCompact(v),
                    },
                } : {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 80, 100, 0.12)' },
                    ticks: {
                        color: '#ff5588',
                        font: { size: 7 },
                        callback: (v) => `${v}%`,
                    },
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#ff5588', font: { size: 7 } },
                },
            },
        } : {
            ...fit,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 6, color: '#ff5588', font: { size: 6 }, padding: 4 },
                },
                title: { display: false },
                tooltip: tooltipLine((ctx) => `${ctx.label}: ${ctx.parsed}% of total wealth`),
            },
        },
    });
}

function updateWealthCharts() {
    if (!instQ || !inst1) return;
    const d = wealthData[currentRegion];
    const qCtx = document.getElementById('chart-quintiles');
    const tCtx = document.getElementById('chart-top1');
    if (!qCtx || !tCtx) return;
    
    const quintileColors = ['rgba(0,255,0,1.0)', 'rgba(0,255,0,0.6)', 'rgba(0,255,0,0.3)', 'rgba(0,255,0,0.15)', 'rgba(0,255,0,0.05)'];
    const qLabels = d.quintiles.map((v, i) => {
        const names = ['Top 20%', '2nd 20%', '3rd 20%', '4th 20%', 'Bottom 20%'];
        return names[i] + ' (' + d.incomes[i] + ')';
    });
    
    instQ.destroy();
    
    const isBar = currentPieType === 'bar';
    instQ = new window.Chart(qCtx, {
        type: currentPieType,
        data: {
            labels: isBar ? ['Top 20%', '2nd 20%', '3rd 20%', '4th 20%', 'Bottom 20%'] : qLabels,
            datasets: [{ data: d.quintiles, backgroundColor: quintileColors, borderColor: '#0f0', borderWidth: 1 }]
        },
        plugins: [pctLabelPlugin],
        options: isBar ? {
            ...chartFitOptions(),
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: tooltipLine((ctx) => {
                    const income = d.incomes[ctx.dataIndex];
                    const name = income ? ctx.label + ' (' + income + ')' : ctx.label;
                    return name + ': ' + ctx.parsed.y + '% of wealth';
                }),
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,255,0,0.1)' },
                    ticks: { color: '#0f0', font: { size: 8 }, callback: (v) => v + '%' },
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#0f0', font: { size: 7 } },
                },
            },
        } : {
            ...chartFitOptions(),
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 8, color: '#0f0', font: { size: 6 }, padding: 4 } },
                title: { display: false },
                tooltip: tooltipLine((ctx) => ctx.label + ': ' + ctx.parsed + '% of wealth'),
            },
        },
    });
    
    inst1?.destroy();
    inst1 = buildTop1Chart(tCtx, d);
}

function renderStatsChart() {
    const qCtx = document.getElementById('chart-quintiles');
    const tCtx = document.getElementById('chart-top1');
    const barCtx = document.getElementById('mr-disco-chart');
    if (!qCtx || !tCtx || !barCtx) return;

    try {
        if (typeof window.Chart === 'undefined') return;
        
        if (statsChartInstance) statsChartInstance.destroy();
        if (instQ) instQ.destroy();
        if (inst1) inst1.destroy();
        
        window.Chart.defaults.color = '#0f0';
        if (window.Chart.defaults.font) window.Chart.defaults.font.family = 'monospace';
        
        const quintileColors = ['rgba(0,255,0,1.0)', 'rgba(0,255,0,0.6)', 'rgba(0,255,0,0.3)', 'rgba(0,255,0,0.15)', 'rgba(0,255,0,0.05)'];
        const d = wealthData[currentRegion];

        instQ = new window.Chart(qCtx, {
            type: 'pie',
            data: { labels: [], datasets: [{ data: [] }] },
            options: chartFitOptions(),
        });
        inst1 = buildTop1Chart(tCtx, d);
        updateWealthCharts();

        // Top 10 GDP Bar Chart
        statsChartInstance = new window.Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['USA', 'CHN', 'DEU', 'JPN', 'GBR', 'IND', 'FRA', 'RUS', 'ITA', 'CAN'],
                datasets: [{ label: 'GDP ($T)', data: [30.8, 19.6, 5.1, 4.4, 4.0, 3.9, 3.4, 2.6, 2.6, 2.3], backgroundColor: 'rgba(255, 255, 255, 0.7)', borderColor: '#fff', borderWidth: 1 }]
            },
            options: {
                ...chartFitOptions(),
                plugins: {
                    legend: { display: false },
                    title: { display: false },
                    tooltip: tooltipLine((ctx) => `${ctx.label}: $${ctx.parsed.y}T`),
                },
                scales: { y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#fff', font: { size: 9 } } }, x: { grid: { display: false }, ticks: { color: '#fff', font: { size: 9 } } } }
            }
        });
        
        // Region Toggle
        document.querySelectorAll('.region-btn:not(.bound)').forEach(btn => {
            btn.classList.add('bound');
            btn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                document.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentRegion = btn.dataset.region;
                updateWealthCharts();
            });
        });

        // Type Toggle
        document.querySelectorAll('.type-btn:not(.bound)').forEach(btn => {
            btn.classList.add('bound');
            btn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPieType = btn.dataset.type;
                updateWealthCharts();
            });
        });

        document.querySelectorAll('.top1-type-btn:not(.bound)').forEach((btn) => {
            btn.classList.add('bound');
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('.top1-type-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                currentTop1Type = btn.dataset.top1Type;
                updateWealthCharts();
            });
        });
        
    } catch (err) {
        barCtx.parentElement.innerHTML = '<div style="color:red; font-size:16px;">ERR: ' + err.message + '</div>';
    }
}