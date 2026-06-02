// iOS layout: vertical HUD rail, sidebar tools, playlist text labels.

import { perf } from './shared.js';

import { resizeCanvas } from './lazy.js';
import { initIosPingPong } from './pong.js';



const REROLL_EYE_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">

  <path fill="none" stroke="currentColor" stroke-width="2.5" d="M 8 50 C 28 12, 72 12, 92 50 C 72 88, 28 88, 8 50 Z"/>

  <circle cx="50" cy="50" r="18" fill="none" stroke="currentColor" stroke-width="1.75"/>

  <circle cx="50" cy="50" r="7" fill="currentColor"/>

</svg>`;



function scrollShell() {

    return document.getElementById('ios-scroll-shell');

}



function scrollRailHome(behavior = 'instant') {

    const shell = scrollShell();

    const main = document.querySelector('.ios-pane-main');

    if (!shell || !main) return;



    const top = main.offsetTop;

    shell.scrollTo({ top, behavior });

}



function swapPlaylistGlyphs() {

    document.querySelectorAll('.playlist-btn').forEach((btn) => {

        const label = btn.dataset.label;

        if (label) btn.textContent = label;

    });

}



function buildScrollShell() {

    const hud = document.getElementById('hud');

    const dock = document.getElementById('docking-bay');

    if (!hud || !dock || document.getElementById('ios-scroll-shell')) return;



    const shell = document.createElement('div');

    shell.id = 'ios-scroll-shell';



    const rail = document.createElement('div');

    rail.id = 'ios-scroll-rail';



    const top = document.createElement('section');

    top.className = 'ios-pane ios-pane-top';

    top.setAttribute('aria-label', 'Title');

    top.appendChild(hud);



    const main = document.createElement('section');
    main.className = 'ios-pane ios-pane-main';
    main.setAttribute('aria-hidden', 'true');

    const hintTop = document.createElement('p');
    hintTop.className = 'ios-scroll-hint ios-scroll-hint-top';
    hintTop.textContent = 'swipe ↓';

    const hintBottom = document.createElement('p');
    hintBottom.className = 'ios-scroll-hint ios-scroll-hint-bottom';
    hintBottom.textContent = 'swipe ↑';

    main.append(hintTop, hintBottom);



    const bottom = document.createElement('section');

    bottom.className = 'ios-pane ios-pane-bottom';

    bottom.setAttribute('aria-label', 'Combination lock');

    bottom.appendChild(dock);



    rail.append(top, main, bottom);

    shell.appendChild(rail);

    document.body.appendChild(shell);

}



function relocateControlsToSidebar() {

    const sidebar = document.getElementById('sidebar-menu');

    const modeBtn = document.getElementById('mode-btn');

    const playlist = document.getElementById('playlist-menu');

    if (!sidebar || !modeBtn || !playlist) return;



    let tools = sidebar.querySelector('.ios-sidebar-tools');

    if (!tools) {

        tools = document.createElement('div');

        tools.className = 'ios-sidebar-tools';

        sidebar.appendChild(tools);

    }



    tools.append(modeBtn, playlist);

    playlist.style.display = 'block';

}



function addIosModalRerollButtons() {

    document.querySelectorAll('.modal .modal-content').forEach((content) => {
        if (content.closest('#modal-arcade')) return;
        if (content.querySelector('.ios-modal-reroll')) return;



        const btn = document.createElement('button');

        btn.type = 'button';

        btn.className = 'ios-modal-reroll';

        btn.setAttribute('aria-label', 'Reroll garden data');

        btn.innerHTML = REROLL_EYE_SVG;

        btn.addEventListener('click', (e) => {

            e.stopPropagation();

            globalThis.gardenHooks?.handleReroll?.();

        });

        content.appendChild(btn);

    });

}



function preventPullToRefresh() {

    const shell = scrollShell();

    let startY = 0;



    const onTouchStart = (e) => {

        if (e.touches[0]) startY = e.touches[0].clientY;

    };



    const onTouchMove = (e) => {

        if (!e.touches[0]) return;

        const dy = e.touches[0].clientY - startY;

        const atTop = shell ? shell.scrollTop <= 0 : window.scrollY <= 0;

        if (atTop && dy > 0) e.preventDefault();

    };



    document.addEventListener('touchstart', onTouchStart, { passive: true });

    document.addEventListener('touchmove', onTouchMove, { passive: false });



    if (shell) {

        shell.addEventListener('touchstart', onTouchStart, { passive: true });

        shell.addEventListener('touchmove', onTouchMove, { passive: false });

    }

}



let iosHintFadeTimer = null;

export function showIosScrollHints() {
    if (!document.body.classList.contains('ios-ui')) return;

    document.querySelectorAll('.ios-scroll-hint').forEach((el) => {
        el.classList.remove('is-hidden');
    });

    clearTimeout(iosHintFadeTimer);
    iosHintFadeTimer = setTimeout(() => {
        document.querySelectorAll('.ios-scroll-hint').forEach((el) => {
            el.classList.add('is-hidden');
        });
        iosHintFadeTimer = null;
    }, 5000);
}

function syncIosOrientation() {
    document.body.classList.toggle('ios-landscape', window.innerWidth > window.innerHeight);
}

function onIosViewportChange() {
    syncIosOrientation();
    scrollRailHome('instant');
    resizeCanvas();
}

export function initIosUi() {

    if (!perf.isIOS) return;



    document.body.classList.add('ios-ui');
    syncIosOrientation();

    buildScrollShell();

    relocateControlsToSidebar();

    swapPlaylistGlyphs();

    addIosModalRerollButtons();

    initIosPingPong();

    preventPullToRefresh();

    window.addEventListener('orientationchange', () => {
        setTimeout(onIosViewportChange, 260);
    });
    window.addEventListener('resize', () => {
        syncIosOrientation();
    }, { passive: true });

    requestAnimationFrame(() => {

        scrollRailHome('instant');

        setTimeout(() => {

            scrollRailHome('instant');

            resizeCanvas();

        }, 120);

        setTimeout(resizeCanvas, 400);

    });

}



export function scrollIosHudHome(behavior = 'smooth') {

    if (!document.body.classList.contains('ios-ui')) return;

    syncIosOrientation();
    scrollRailHome(behavior);

    setTimeout(resizeCanvas, behavior === 'instant' ? 160 : 480);

}


