javascript:(function(){
  /* SPEED COPY DASHBOARD
     Creates a popup with 5 buttons to populate Clipboard History separately.
  */
  try {
    // 1. Get Text (Ctrl+A Logic)
    let text = window.getSelection().toString();
    if (!text || text.trim().length === 0) text = document.body.innerText;
    
    if (!text || text.trim().length < 20) {
        alert("⚠️ Please press Ctrl + A (Select All) first!");
        return;
    }

    // 2. Extraction Logic
    function get(pattern) {
        let match = text.match(pattern);
        return match ? match[1].trim() : "Not Found";
    }

    // Extract the 5 specific items
    const dataItems = [
        { label: "Order ID", val: get(/Order ID\s*:?\s*(\d+)/i) },
        { label: "Phone",    val: get(/Phone\s*:?\s*(\d+)/i) },
        { label: "Name",     val: get(/Deliver To\s*:?\s*([\s\S]*?)\s*Phone/i) },
        { label: "Address",  val: get(/Billing Address\s*:?\s*([\s\S]*?)\s*(?:Ordered Items|Product Name|#|Bill To)/i) },
        { label: "Total",    val: "Not Found" }
    ];

    // Total logic
    const totalMatches = text.match(/Total\s*:?\s*([0-9,]+\.?\d*)/gi);
    if (totalMatches) {
        dataItems[4].val = totalMatches[totalMatches.length - 1].replace(/Total\s*:?\s*/i, '').trim();
    }

    // 3. Create the Dashboard UI
    const box = document.createElement("div");
    box.style.cssText = "position:fixed; top:20px; right:20px; background:#222; color:white; padding:15px; z-index:99999; border-radius:8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-family:sans-serif; width: 300px;";
    
    // Header
    const title = document.createElement("div");
    title.innerHTML = "<b>📋 Click to Copy</b> <span style='float:right;cursor:pointer;' onclick='this.parentElement.parentElement.remove()'>✖</span>";
    title.style.marginBottom = "10px";
    title.style.borderBottom = "1px solid #555";
    title.style.paddingBottom = "5px";
    box.appendChild(title);

    // 4. Create a Button for each Item
    dataItems.forEach(item => {
        const row = document.createElement("div");
        row.style.marginBottom = "8px";
        row.style.display = "flex";
        row.style.alignItems = "center";

        const btn = document.createElement("button");
        btn.innerText = "Copy " + item.label;
        btn.style.cssText = "background:#f57224; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold; flex:1; margin-right:5px;";
        
        // Value preview
        const preview = document.createElement("span");
        preview.innerText = item.val.substring(0, 15) + "...";
        preview.style.fontSize = "11px";
        preview.style.color = "#ccc";

        // Click Event
        btn.onclick = function() {
            navigator.clipboard.writeText(item.val);
            
            // Visual Flash
            const originalText = btn.innerText;
            btn.innerText = "✅ Copied!";
            btn.style.background = "#4CAF50";
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.background = "#f57224";
            }, 800);
        };

        row.appendChild(btn);
        row.appendChild(preview);
        box.appendChild(row);
    });

    document.body.appendChild(box);

  } catch (e) {
    alert("Error: " + e.message);
  }
})();
