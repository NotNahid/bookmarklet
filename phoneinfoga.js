javascript:(function(){
    /* Remove existing instance if open */
    var existing = document.getElementById('phone-osint-overlay');
    if(existing) existing.remove();

    /* --- UI: Create the Modal --- */
    var overlay = document.createElement('div');
    overlay.id = 'phone-osint-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;justify-content:center;align-items:center;font-family:sans-serif;';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:#1e1e1e;color:#fff;padding:25px;border-radius:12px;width:400px;box-shadow:0 10px 25px rgba(0,0,0,0.5);border:1px solid #333;';
    modal.innerHTML = `
        <h2 style="margin-top:0;color:#61dafb;font-size:20px;border-bottom:1px solid #333;padding-bottom:10px;">PhoneInfoga Helper</h2>
        
        <label style="display:block;margin-top:15px;font-size:12px;color:#aaa;">Target Phone Number (Intl format):</label>
        <input type="text" id="osint-input" placeholder="+880 1960..." style="width:100%;padding:10px;margin-top:5px;background:#2d2d2d;border:1px solid #444;color:#fff;border-radius:6px;box-sizing:border-box;font-size:16px;">
        
        <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px;">
            <button id="btn-general" style="padding:12px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;transition:0.2s;">🔍 Search General (Ultimate)</button>
            <button id="btn-docs" style="padding:12px;background:#007bff;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;transition:0.2s;">📂 Search Documents</button>
            <button id="btn-social" style="padding:12px;background:#6f42c1;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;transition:0.2s;">🌐 Search Social Media</button>
        </div>

        <button id="btn-close" style="margin-top:20px;width:100%;padding:10px;background:transparent;border:1px solid #555;color:#aaa;border-radius:6px;cursor:pointer;">Close</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    /* --- UX: Focus Input immediately --- */
    var inputField = document.getElementById('osint-input');
    inputField.focus();

    /* --- LOGIC: Number Parsing & Dork Gen --- */
    function getFormats(input) {
        // Strip everything but digits
        var raw = input.replace(/\D/g, '');
        
        // Basic formats
        var e164 = "+" + raw;
        var intl = raw;
        
        // Attempt to guess "Local" format (specifically for BD +880 context)
        // If it starts with 880, local is often 0 + rest
        var local = "";
        if(raw.startsWith("880")) {
            local = "0" + raw.substring(3);
        } else {
            // Fallback: just use raw if we can't guess local
            local = raw; 
        }

        return { e164, intl, local };
    }

    function googleSearch(query) {
        window.open('https://www.google.com/search?q=' + encodeURIComponent(query), '_blank');
    }

    /* --- EVENT LISTENERS --- */
    
    // 1. General "Ultimate" Search
    document.getElementById('btn-general').onclick = function() {
        var fmt = getFormats(inputField.value);
        if(!fmt.intl) return alert("Please enter a number");
        
        // Pattern: intext:"intl" OR intext:"e164" OR intext:"local"
        var dork = `intext:"${fmt.intl}" OR intext:"${fmt.e164}" OR intext:"${fmt.local}"`;
        googleSearch(dork);
    };

    // 2. Documents Search
    document.getElementById('btn-docs').onclick = function() {
        var fmt = getFormats(inputField.value);
        if(!fmt.intl) return alert("Please enter a number");

        // Pattern: (ext:doc OR ...) (intext:...)
        var extensions = '(ext:doc OR ext:docx OR ext:pdf OR ext:xls OR ext:xlsx OR ext:txt OR ext:csv)';
        var numbers = `(intext:"${fmt.intl}" OR intext:"${fmt.e164}" OR intext:"${fmt.local}")`;
        googleSearch(extensions + " " + numbers);
    };

    // 3. Social Media Search
    document.getElementById('btn-social').onclick = function() {
        var fmt = getFormats(inputField.value);
        if(!fmt.intl) return alert("Please enter a number");

        // Pattern: site:social... (intext:...)
        var sites = 'site:facebook.com OR site:twitter.com OR site:linkedin.com OR site:instagram.com OR site:vk.com';
        var numbers = `(intext:"${fmt.intl}" OR intext:"${fmt.e164}" OR intext:"${fmt.local}")`;
        googleSearch(sites + " " + numbers);
    };

    // Close Button
    document.getElementById('btn-close').onclick = function() {
        overlay.remove();
    };

    // Close on clicking outside modal
    overlay.onclick = function(e) {
        if(e.target === overlay) overlay.remove();
    };

})();
