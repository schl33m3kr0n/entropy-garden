echo '
/* Fix iOS 300ms delay and double-tap hover bugs */
a, button, input, select, textarea, .ui-btn, [role="button"], .sidebar-text, .lightbox-close, .carousel-btn {
    touch-action: manipulation;
}
' >> css/base.css
