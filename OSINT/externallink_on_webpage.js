/* God Mode Module: External Link Scraper
   Logic: Scans DOM for <a> tags, filters for different hostnames
*/
javascript:(function(){
    var links = document.querySelectorAll('a');
    var externalLinks = new Set(); // Use Set to avoid duplicates
    var currentHost = window.location.hostname;

    links.forEach(function(link){
        if(link.hostname && link.hostname !== currentHost && link.href.startsWith('http')){
            externalLinks.add(link.href);
        }
    });

    if(externalLinks.size === 0) {
        alert("No external links found.");
    } else {
        // Create a simple popup to show results
        var win = window.open("", "LinkDump", "width=600,height=400,scrollbars=yes");
        win.document.write("<h3>External Links Found:</h3><ul>");
        externalLinks.forEach(function(url){
            win.document.write("<li><a href='" + url + "' target='_blank'>" + url + "</a></li>");
        });
        win.document.write("</ul>");
    }
})();
