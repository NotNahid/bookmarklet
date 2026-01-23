javascript:(function() {
    /* --- PREVENT DUPLICATES --- */
    if (document.getElementById('msg-scraper-panel')) return;

    /* --- STATE VARIABLES --- */
    let messageHistory = []; 
    let isRecording = false;
    let scraperInterval = null;
    
    // Auto-Scroll Variables
    let isScrolling = false;
    let scrollSpeed = 2;
    let scrollDir = -1; 
    let scrollFrameId = null;
    let scrollTargetElement = null; // The "Detective" stores the target here

    /* --- DETECTIVE FUNCTION --- */
    // This finds the correct box to scroll (instead of the window)
    function findScrollableTarget() {
        // 1. Get all DIVs on the page
        const candidates = document.querySelectorAll('div');
        let largest = null;
        let maxArea = 0;

        // 2. Loop through them
        candidates.forEach(el => {
            // Must have a scrollbar (scrollHeight > clientHeight)
            if (el.scrollHeight > el.clientHeight) {
                const style = window.getComputedStyle(el);
                // Must have overflow set to auto or scroll
                if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                    // 3. Pick the largest one by area (Width x Height)
                    // This avoids scrolling small sidebars or chat lists
                    const area = el.clientWidth * el.clientHeight;
                    if (area > maxArea) {
                        maxArea = area;
                        largest = el;
                    }
                }
            }
        });
        
        // If no div found, default to window (fallback)
        return largest || window;
    }

    /* --- CREATE GUI --- */
    const panel = document.createElement('div');
    panel.id = 'msg-scraper-panel';
    panel.style.cssText = 'position:fixed; top:80px; right:20px; width:240px; background:#111; color:white; padding:15px; border-radius:10px; z-index:9999; font-family:sans-serif; box-shadow: 0 6px 16px rgba(0,0,0,0.7); border: 1px solid #444;';
    
    const title = document.createElement('h3');
    title.innerText = "Messenger Scraper (Targeted)";
    title.style.cssText = 'margin:0 0 5px 0; font-size:15px; text-align:center; color:#ffcc00;';
    
    const counter = document.createElement('div');
    counter.innerText = "0 Messages";
    counter.style.cssText = 'font-size:20px; text-align:center; margin-bottom:15px; font-weight:bold; color:#fff;';

    const btnRecord = document.createElement('button');
    btnRecord.innerText = "▶ START RECORDING";
    btnRecord.style.cssText = 'width:100%; padding:10px; margin-bottom:15px; background:#28a745; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; letter-spacing:1px;';

    const scrollLabel = document.createElement('div');
    scrollLabel.innerText = "SMART SCROLL";
    scrollLabel.style.cssText = 'font-size:10px; color:#aaa; margin-bottom:5px; text-align:center; border-top: 1px solid #333; padding-top:10px;';

    const scrollBtnContainer = document.createElement('div');
    scrollBtnContainer.style.cssText = 'display:flex; gap:5px; margin-bottom:10px;';

    const btnScrollUp = document.createElement('button');
    btnScrollUp.innerText = "⬆ UP";
    btnScrollUp.style.cssText = 'flex:1; padding:8px; background:#444; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;';

    const btnScrollStop = document.createElement('button');
    btnScrollStop.innerText = "⏹";
    btnScrollStop.style.cssText = 'width:40px; padding:8px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;';

    const btnScrollDown = document.createElement('button');
    btnScrollDown.innerText = "⬇ DOWN";
    btnScrollDown.style.cssText = 'flex:1; padding:8px; background:#444; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;';

    const speedContainer = document.createElement('div');
    speedContainer.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:15px;';
    const speedInput = document.createElement('input');
    speedInput.type = "range";
    speedInput.min = "1";
    speedInput.max = "50"; 
    speedInput.value = "2";
    speedInput.style.cssText = 'flex:1; cursor:pointer;';
    const speedVal = document.createElement('span');
    speedVal.innerText = "Speed: 2";
    speedVal.style.cssText = 'font-size:12px; color:#aaa; width:55px; text-align:right;';

    speedContainer.appendChild(speedInput);
    speedContainer.appendChild(speedVal);
    scrollBtnContainer.appendChild(btnScrollUp);
    scrollBtnContainer.appendChild(btnScrollStop);
    scrollBtnContainer.appendChild(btnScrollDown);

    const btnSave = document.createElement('button');
    btnSave.innerText = "💾 SAVE JSON";
    btnSave.style.cssText = 'width:100%; padding:10px; background:#007bff; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; display:none; margin-top:5px;';

    const btnClose = document.createElement('button');
    btnClose.innerText = "❌ Close";
    btnClose.style.cssText = 'margin-top:10px; background:none; border:none; color:#555; width:100%; cursor:pointer; font-size:11px;';

    panel.appendChild(title);
    panel.appendChild(counter);
    panel.appendChild(btnRecord);
    panel.appendChild(scrollLabel);
    panel.appendChild(scrollBtnContainer);
    panel.appendChild(speedContainer);
    panel.appendChild(btnSave);
    panel.appendChild(btnClose);
    document.body.appendChild(panel);

    /* --- SCROLL LOGIC --- */
    function scrollTick() {
        if (!isScrolling || !scrollTargetElement) return;
        
        // SCROLL THE TARGET, NOT THE WINDOW
        scrollTargetElement.scrollBy(0, scrollDir * scrollSpeed);
        
        scrollFrameId = requestAnimationFrame(scrollTick);
    }

    function setScroll(state, dir) {
        isScrolling = state;
        if (dir) scrollDir = dir;
        
        if (state) {
            // RUN THE DETECTIVE!
            scrollTargetElement = findScrollableTarget();
            
            // Visual check: Highlight the box we found so you know it's working
            if (scrollTargetElement !== window) {
                scrollTargetElement.style.boxShadow = "inset 0 0 20px rgba(0,255,0,0.2)";
                console.log("Found scroll target:", scrollTargetElement);
            }

            cancelAnimationFrame(scrollFrameId); 
            scrollTick();
            
            // Update Buttons
            btnScrollUp.style.background = (scrollDir === -1) ? '#28a745' : '#444';
            btnScrollDown.style.background = (scrollDir === 1) ? '#28a745' : '#444';
        } else {
            cancelAnimationFrame(scrollFrameId);
            btnScrollUp.style.background = '#444';
            btnScrollDown.style.background = '#444';
            if (scrollTargetElement && scrollTargetElement.style) {
                 scrollTargetElement.style.boxShadow = "none";
            }
        }
    }

    /* --- SCRAPER LOGIC --- */
    function scanMessages() {
        const mainChat = document.querySelector('[role="main"]');
        if (!mainChat) return;

        const rows = mainChat.querySelectorAll('div[role="row"]');
        const screenMiddle = window.innerWidth / 2;
        let currentScanBatch = [];

        rows.forEach(row => {
            const rowRect = row.getBoundingClientRect();
            if (rowRect.bottom < 0 || rowRect.top > window.innerHeight) return;
            if (row.getAttribute('data-scraped-row') === 'true') return;

            let rowParts = []; 
            let rowType = "";
            const bubbles = row.querySelectorAll('div[dir="auto"], img, video');

            bubbles.forEach(bubble => {
                if (bubble.tagName === 'IMG') {
                    const width = bubble.getBoundingClientRect().width;
                    const src = bubble.src || "";
                    if (width < 40 && !src.includes('emoji')) return;
                }
                const bubbleRect = bubble.getBoundingClientRect();
                const type = bubbleRect.left > screenMiddle ? "Sent" : "Received";
                if (!rowType) rowType = type;
                
                let content = "";
                if (bubble.tagName === 'DIV') content = bubble.innerText.trim();
                else if (bubble.tagName === 'IMG') content = bubble.getAttribute('alt') || "[Image]";
                else if (bubble.tagName === 'VIDEO') content = "[Video]";

                if (!content) return;
                bubble.style.border = type === "Sent" ? "3px solid #00ff00" : "3px solid #0000ff"; 
                bubble.style.boxSizing = "border-box";
                rowParts.push(content);
            });

            if (rowParts.length > 0) {
                row.setAttribute('data-scraped-row', 'true');
                currentScanBatch.push({ type: rowType, text: rowParts.join(" ") });
            }
        });

        if (currentScanBatch.length > 0) {
            // Directional Stacking: 
            // If scrolling UP (-1), add new items to START.
            // If scrolling DOWN (1), add new items to END.
            if (scrollDir === -1) {
                messageHistory = [...currentScanBatch, ...messageHistory];
            } else {
                messageHistory = [...messageHistory, ...currentScanBatch];
            }
        }
        counter.innerText = `${messageHistory.length} Messages`;
    }

    /* --- LISTENERS --- */
    btnRecord.onclick = function() {
        if (!isRecording) {
            isRecording = true;
            btnRecord.innerText = "⏸ PAUSE RECORDING";
            btnRecord.style.backgroundColor = "#ffc107";
            btnRecord.style.color = "black";
            btnSave.style.display = "block";
            scraperInterval = setInterval(scanMessages, 800);
        } else {
            isRecording = false;
            clearInterval(scraperInterval);
            btnRecord.innerText = "▶ RESUME RECORDING";
            btnRecord.style.backgroundColor = "#28a745";
            btnRecord.style.color = "white";
        }
    };

    btnScrollUp.onclick = () => setScroll(true, -1);
    btnScrollDown.onclick = () => setScroll(true, 1);
    btnScrollStop.onclick = () => setScroll(false, null);

    speedInput.oninput = function() {
        scrollSpeed = parseInt(this.value);
        speedVal.innerText = `Speed: ${this.value}`;
    };

    btnSave.onclick = function() {
        setScroll(false);
        isRecording = false;
        clearInterval(scraperInterval);
        btnRecord.innerText = "▶ START RECORDING"; 
        btnRecord.style.backgroundColor = "#28a745";
        
        const blob = new Blob([JSON.stringify(messageHistory, null, 2)], {type: "application/json"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "messenger_chat.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        counter.innerText = `Saved ${messageHistory.length} items!`;
    };
    
    btnClose.onclick = function() {
        setScroll(false);
        clearInterval(scraperInterval);
        panel.remove();
    };
})();
