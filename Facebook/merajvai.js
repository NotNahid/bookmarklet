(function () {
  if (window.fbUnfriendRunning) return;
  window.fbUnfriendRunning = true;

  const buttons = Array.from(
    document.querySelectorAll(
      'div[role="button"][aria-label^="More options for"]'
    )
  );

  let index = 0;

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  }

  function clearStyles() {
    buttons.forEach(b => {
      b.style.outline = "";
      b.style.background = "";
    });
  }

  function next() {
    if (!window.fbUnfriendRunning) return;

    if (index >= buttons.length) {
      console.log("✅ Done");
      window.fbUnfriendRunning = false;
      return;
    }

    const btn = buttons[index++];
    if (!isVisible(btn)) {
      return setTimeout(next, 300); // skip invisible
    }

    clearStyles();
    btn.scrollIntoView({ behavior: "smooth", block: "center" });
    btn.style.outline = "3px solid red";
    btn.style.background = "rgba(255,0,0,0.15)";

    console.log(`➡️ ${index}/${buttons.length}:`, btn.getAttribute("aria-label"));

    setTimeout(() => {
      btn.click();

      // wait for menu
      setTimeout(() => {
        const unfriendBtn = Array.from(
          document.querySelectorAll('div[role="menuitem"]')
        ).find(el => el.innerText.trim().startsWith("Unfriend"));

        if (!unfriendBtn) {
          console.warn("⏭️ No Unfriend → skipping");
          return setTimeout(next, 800);
        }

        unfriendBtn.click();
        console.log("🧹 Unfriend clicked");

        setTimeout(() => {
          const confirmBtn = Array.from(document.querySelectorAll("span"))
            .find(s => s.innerText.trim() === "Confirm");

          if (!confirmBtn) {
            console.warn("❌ Confirm missing");
            return setTimeout(next, 800);
          }

          confirmBtn.click();
          console.log("✅ Confirmed");

          setTimeout(next, 1500);
        }, 900);

      }, 700);

    }, 800);
  }

  next();
})();
