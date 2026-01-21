(function () {
  if (window.fbUI) return;
  window.fbUI = { running: false, delay: 1500 };

  /* ---------- UI ---------- */
  const panel = document.createElement("div");
  panel.style = `
    position: fixed;
    top: 120px;
    left: 30px;
    z-index: 999999;
    background: #111;
    color: #fff;
    padding: 12px;
    border-radius: 12px;
    font-family: system-ui;
    width: 220px;
    box-shadow: 0 10px 30px rgba(0,0,0,.4);
    cursor: grab;
  `;

  panel.innerHTML = `
    <div style="font-weight:600;margin-bottom:8px">FB Unfriend Tool</div>
    <button id="fbToggle" style="width:100%;padding:6px;border-radius:6px;border:none;background:#22c55e;color:#000;font-weight:600">Start</button>
    <div style="margin-top:10px;font-size:12px">Speed</div>
    <input id="fbSpeed" type="range" min="800" max="4000" step="200" value="1500" style="width:100%">
    <div id="fbStatus" style="margin-top:8px;font-size:12px;opacity:.8">Idle</div>
  `;

  document.body.appendChild(panel);

  /* ---------- Drag ---------- */
  let ox, oy, dragging = false;
  panel.onmousedown = e => {
    dragging = true;
    ox = e.clientX - panel.offsetLeft;
    oy = e.clientY - panel.offsetTop;
    panel.style.cursor = "grabbing";
  };
  document.onmousemove = e => {
    if (!dragging) return;
    panel.style.left = e.clientX - ox + "px";
    panel.style.top = e.clientY - oy + "px";
  };
  document.onmouseup = () => {
    dragging = false;
    panel.style.cursor = "grab";
  };

  const status = panel.querySelector("#fbStatus");
  const toggle = panel.querySelector("#fbToggle");
  const speed = panel.querySelector("#fbSpeed");

  speed.oninput = () => window.fbUI.delay = +speed.value;

  toggle.onclick = () => {
    window.fbUI.running = !window.fbUI.running;
    toggle.innerText = window.fbUI.running ? "Pause" : "Start";
    toggle.style.background = window.fbUI.running ? "#ef4444" : "#22c55e";
    status.innerText = window.fbUI.running ? "Running…" : "Paused";
    if (window.fbUI.running) run();
  };

  /* ---------- Logic ---------- */
  let index = 0;

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  }

  function clearHighlight() {
    document.querySelectorAll(".fb-active").forEach(e => {
      e.classList.remove("fb-active");
      e.style.outline = "";
      e.style.background = "";
    });
  }

  async function run() {
    const buttons = Array.from(
      document.querySelectorAll(
        'div[role="button"][aria-label^="More options for"]'
      )
    );

    if (!window.fbUI.running || index >= buttons.length) {
      status.innerText = "Done";
      window.fbUI.running = false;
      toggle.innerText = "Start";
      toggle.style.background = "#22c55e";
      return;
    }

    const btn = buttons[index++];
    if (!isVisible(btn)) return setTimeout(run, 300);

    clearHighlight();
    btn.classList.add("fb-active");
    btn.scrollIntoView({ behavior: "smooth", block: "center" });
    btn.style.outline = "3px solid red";
    btn.style.background = "rgba(255,0,0,.15)";
    status.innerText = btn.getAttribute("aria-label");

    await wait(600);
    if (!window.fbUI.running) return;

    btn.click();

    await wait(700);
    const unfriend = Array.from(
      document.querySelectorAll('div[role="menuitem"]')
    ).find(e => e.innerText.trim().startsWith("Unfriend"));

    if (!unfriend) return setTimeout(run, 500);
    unfriend.click();

    await wait(700);
    const confirm = Array.from(document.querySelectorAll("span"))
      .find(s => s.innerText.trim() === "Confirm");

    if (confirm) confirm.click();

    setTimeout(run, window.fbUI.delay);
  }

  function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

})();
