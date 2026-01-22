javascript:(function(){
    /* 1. Get the full HTML of the page */
    var htmlContent = document.documentElement.outerHTML;
    
    /* 2. Create a hidden text box to copy from */
    var el = document.createElement('textarea');
    el.value = htmlContent;
    document.body.appendChild(el);
    
    /* 3. Select and Copy */
    el.select();
    document.execCommand('copy');
    
    /* 4. Remove the text box */
    document.body.removeChild(el);
    
    /* 5. Confirm success */
    alert("Full HTML copied to clipboard! (" + htmlContent.length + " characters)");
})();
