/**
 * Auto-inject Home button into the navigation menu
 * This handles cases where the main HTML file might be cached without the Home button
 */
(function() {
  function injectHomeButton() {
    const navMenu = document.querySelector('nav.sb-nav');
    if (!navMenu) return;
    
    // Check if Home button already exists
    if (navMenu.querySelector('button[data-sec="dashboard"]')) {
      return;
    }
    
    const searchEl = navMenu.querySelector('.nav-search');
    if (!searchEl) return;
    
    const homeBtnHTML = `
      <div class="nav-grp">
        <button class="nav-btn" data-sec="dashboard" onclick="nav(this)">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5H9v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V10z"/>
          </svg>
          <span>Home</span>
        </button>
      </div>
    `;
    
    searchEl.insertAdjacentHTML('afterend', homeBtnHTML);
  }
  
  // Inject immediately if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectHomeButton);
  } else {
    injectHomeButton();
  }
  
  // Also try to inject after a short delay to handle dynamic content loading
  setTimeout(injectHomeButton, 500);
})();
