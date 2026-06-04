/**
 * file:// cannot load ES modules — block the legacy monolith and point at local serve.
 */
(function () {
    if (location.protocol !== 'file:') return;

    document.documentElement.classList.add('file-protocol');

    function mountNotice() {
        if (document.getElementById('file-protocol-notice')) return;

        var panel = document.createElement('div');
        panel.id = 'file-protocol-notice';
        panel.setAttribute('role', 'alert');
        panel.innerHTML =
            '<p class="file-protocol-title">/// LOCAL PREVIEW REQUIRES HTTP ///</p>'
            + '<p>Browsers block modules on <code>file://</code>. Use the same bundle as production:</p>'
            + '<p class="file-protocol-cmd">bash scripts/dev/serve-local.sh</p>'
            + '<p>Or open <strong>scripts/dev/Serve Entropy Garden.command</strong>, then visit the URL shown (usually <code>http://localhost:8765</code>).</p>';

        document.body.appendChild(panel);
    }

    if (document.body) mountNotice();
    else document.addEventListener('DOMContentLoaded', mountNotice);
})();
