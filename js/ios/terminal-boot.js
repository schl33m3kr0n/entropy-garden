/**
 * Terminal FAB bootstrap — classic script, no ES module graph.
 * Runs on all platforms so the terminal opens from the >_ button even if main.js is slow.
 */
(function () {
    var lastTap = 0;

    function revealTerminalShell() {
        if (!document.body.classList.contains('garden-ready')) return false;
        var term = document.getElementById('terminal-container');
        var input = document.getElementById('term-input');
        if (!term) return false;

        term.removeAttribute('hidden');
        term.classList.add('reveal-in', 'is-sliver', 'active');

        var toggle = document.getElementById('ios-terminal-toggle');
        if (toggle) toggle.removeAttribute('hidden');

        if (input) {
            input.tabIndex = 0;
            window.setTimeout(function () {
                try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
            }, 80);
        }
        return true;
    }

    function runModuleCommand(line) {
        var boot = document.createElement('script');
        boot.type = 'module';
        boot.textContent = [
            "import { loadTerminal, pushTerminalLog } from '/js/lazy.js';",
            'loadTerminal().then(function (m) {',
            '  pushTerminalLog("> " + ' + JSON.stringify(line) + ');',
            '  m.processCommand(' + JSON.stringify(line) + ');',
            '}).catch(function (err) {',
            '  console.error("[Entropy Garden] terminal command failed", err);',
            '});',
        ].join('\n');
        document.body.appendChild(boot);
    }

    function bindInputSubmit() {
        var input = document.getElementById('term-input');
        if (!input || input.dataset.iosBootCmd) return;
        input.dataset.iosBootCmd = '1';
        input.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.keyCode !== 13) {
                if (typeof globalThis.gardenHooks?.toggleTerminal !== 'function'
                    && globalThis.EntropyTerminalSfx?.keystroke) {
                    globalThis.EntropyTerminalSfx.keystroke();
                }
                return;
            }
            var val = (input.value || '').trim();
            if (!val) return;
            e.preventDefault();
            input.value = '';
            runModuleCommand(val);
        });
    }

    function onTap(e) {
        if (!document.body.classList.contains('garden-ready')) return;
        var now = Date.now();
        if (now - lastTap < 400) return;
        lastTap = now;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        bindInputSubmit();
        if (typeof globalThis.gardenHooks?.openTerminal === 'function') {
            globalThis.gardenHooks.openTerminal();
        } else {
            revealTerminalShell();
        }
    }

    function bindToggle() {
        var btn = document.getElementById('ios-terminal-toggle');
        if (!btn || btn.dataset.iosBootBound) return;
        btn.dataset.iosBootBound = '1';
        btn.addEventListener('touchend', onTap, { passive: false });
        btn.addEventListener('click', onTap);
    }

    function onGardenReady() {
        bindToggle();
        bindInputSubmit();
        var toggle = document.getElementById('ios-terminal-toggle');
        if (toggle) toggle.removeAttribute('hidden');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindToggle);
    } else {
        bindToggle();
    }
    window.addEventListener('entropy:garden-ready', onGardenReady, { once: true });
    globalThis.EntropyIosTerminalBoot = { revealTerminalShell: revealTerminalShell };
})();
