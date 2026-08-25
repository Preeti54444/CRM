document.addEventListener('DOMContentLoaded', () => {
  try {
    // Inject basic helper styles if not present
    const styleId = 'accessibility-init-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .sr-only { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        .accessible-btn:focus { outline: 3px solid #2563eb; outline-offset: 2px; }
        .btn-icon { font-size: 16px; line-height: 1; display:inline-block; width:1em; text-align:center }
      `;
      document.head.appendChild(style);
    }

    // Ensure all <button> have type and accessible class; copy title->aria-label if missing
    const buttons = Array.from(document.querySelectorAll('button'));
    buttons.forEach((b) => {
      if (!b.hasAttribute('type')) b.setAttribute('type', 'button');
      if (!b.classList.contains('accessible-btn')) b.classList.add('accessible-btn');
      if (!b.getAttribute('aria-label') && b.title) b.setAttribute('aria-label', b.title);
    });

    // For buttons that contain only emoji (no alphanumeric characters), try to wrap emoji in span[aria-hidden] and add sr-only label from title/data attributes
    buttons.forEach((b) => {
      const text = b.innerText.trim();
      if (text && !/[A-Za-z0-9]/.test(text)) {
        // if first child is text node, move it into an icon span
        const fc = b.firstChild;
        if (fc && fc.nodeType === Node.TEXT_NODE) {
          const emoji = document.createElement('span');
          emoji.className = 'btn-icon';
          emoji.setAttribute('aria-hidden', 'true');
          emoji.textContent = fc.textContent;
          b.insertBefore(emoji, fc);
          b.removeChild(fc);
        }
        // ensure aria-label exists
        if (!b.getAttribute('aria-label')) {
          const label = b.title || b.dataset.action || b.getAttribute('data-label') || '';
          if (label) {
            b.setAttribute('aria-label', label);
            const sr = document.createElement('span');
            sr.className = 'sr-only';
            sr.textContent = label;
            b.appendChild(sr);
          }
        }
      }
    });

    // Make anchors with role=button keyboard-operable
    Array.from(document.querySelectorAll('a[role="button"]')).forEach((a) => {
      if (!a.hasAttribute('tabindex')) a.setAttribute('tabindex', '0');
      a.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          a.click();
        }
      });
    });

    // Add a global focus visible polyfill for mouse/touch users (optional)
    document.addEventListener('mousedown', () => document.documentElement.classList.add('using-mouse'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') document.documentElement.classList.remove('using-mouse');
    });
  } catch (err) {
    console.warn('accessibility-init failed', err);
  }
});
