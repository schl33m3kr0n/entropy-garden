/**
 * Terminal UI sounds — classic script (no modules). Used by iOS boot + lazy shell open.
 */
(function () {
    var cache = {};
    var lastOpenAt = 0;

    function playFile(file, volume) {
        var src = 'assets/audio/sfx/' + file;
        var audio = cache[src];
        if (!audio) {
            audio = new Audio(src);
            audio.preload = 'auto';
            cache[src] = audio;
        }
        try {
            var clone = audio.cloneNode();
            clone.volume = volume != null ? volume : 0.5;
            clone.currentTime = 0;
            clone.play().catch(function () {});
        } catch (e) {
            /* ignore */
        }
    }

    function playElement(id, volume) {
        var el = document.getElementById(id);
        if (!el) return false;
        try {
            el.volume = volume != null ? volume : 0.5;
            el.currentTime = 0;
            el.play().catch(function () {});
            return true;
        } catch (e) {
            return false;
        }
    }

    globalThis.EntropyTerminalSfx = {
        open: function () {
            var now = Date.now();
            if (now - lastOpenAt < 700) return;
            lastOpenAt = now;
            playFile('radio.mp3', 0.45);
        },
        close: function () {
            if (!playElement('burp-sound')) playFile('burp.mp3', 0.55);
        },
        keystroke: function () {
            playFile('keystroke.mp3', 0.35);
        },
        unknown: function () {
            if (!playElement('error-sound')) playFile('unknown command.mp3', 0.5);
        },
    };
})();
