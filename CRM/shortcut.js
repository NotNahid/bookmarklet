javascript:(function() {
  /* --- MAPPING: Keys to specific sidebar URL fragments --- */
  const shortcuts = {
    'h': '/home',
    'd': '/crm/dashboard',
    'l': '/crm/leads',
    'o': '/crm/opportunities',
    'q': '/crm/quotes',
    'r': '/crm/reports',
    't': '/help-desk/ticket-list',
    'i': '/help-desk/inbox',
    'k': '/task-manager/tasks',
    'u': '/users',
    's': '/settings'
  };

  /* --- LOGIC --- */
  document.addEventListener('keydown', function(e) {
    if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
      const key = e.key.toLowerCase();
      if (shortcuts[key]) {
        e.preventDefault();
        
        // METHOD 1: Try to find the link in the sidebar and click it (Keeps script alive in SPAs)
        const targetLink = document.querySelector(`a[href="${shortcuts[key]}"]`);
        
        if (targetLink) {
           targetLink.click();
        } else {
           // Fallback: If link is hidden, force load (will kill script, but better than nothing)
           window.location.href = window.location.origin + shortcuts[key];
        }
      }
    }
  });

  /* --- NOTIFICATION --- */
  const toast = document.createElement('div');
  toast.innerText = 'CRM Keys Active (Soft Mode)';
  Object.assign(toast.style, {
    position: 'fixed', bottom: '20px', right: '20px',
    backgroundColor: '#2ecc71', color: '#fff', padding: '10px 20px',
    borderRadius: '5px', zIndex: '99999', fontFamily: 'sans-serif',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
})();
