/*
 * Standalone chat widget shared by every raw-HTML site (the franchisor's
 * corporate site and every franchisee site) — all served outside React,
 * so the React ChatWidget component can't mount there. Talks to the same
 * /api/chat proxy with the same {session_id, message} contract.
 *
 * Styling uses its own --cw-* custom properties with hardcoded fallback
 * colors, deliberately NOT the host page's own tokens (--forest, --cream,
 * etc.). An earlier version read the host page's variables directly to
 * "look native," but each raw-HTML site defines its own unrelated color
 * scheme under those same names — e.g. the franchisee template's --cream
 * is a near-black ink color, not an off-white, since it means something
 * different there. Reusing those names made the widget's text render in
 * the same color as its own background on that site. Namespacing avoids
 * ever colliding with whatever a given site happens to call --cream.
 */
(function () {
  var sessionId = null;
  var done = false;
  var loading = false;
  var panel, messagesEl, form, input, sendBtn, toggleBtn;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) {
      node.appendChild(c);
    });
    return node;
  }

  function injectStyles() {
    var style = document.createElement("style");
    style.textContent =
      "#cw-toggle,#cw-panel{" +
      "--cw-forest:#182e24;--cw-sage:#2a5240;--cw-mint:#4a9e78;--cw-gold:#c9a84c;--cw-gold-light:#e8cc80;" +
      "--cw-cream:#f5f0e8;--cw-muted:#7a8e83;--cw-glass:rgba(255,255,255,0.05);--cw-glass-b:rgba(201,168,76,0.18);" +
      "}" +
      "#cw-toggle{position:fixed;bottom:1.5rem;right:1.5rem;z-index:1000;padding:0.85rem 1.5rem;border:none;border-radius:999px;cursor:pointer;" +
      "background:linear-gradient(135deg,var(--cw-mint),var(--cw-sage));color:#fff;font-family:'Plus Jakarta Sans',sans-serif;" +
      "font-size:0.85rem;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.35);}" +
      "#cw-toggle:hover{filter:brightness(1.08);}" +
      "#cw-panel{position:fixed;bottom:1.5rem;right:1.5rem;z-index:1000;width:320px;height:26rem;display:flex;flex-direction:column;" +
      "background:var(--cw-forest);border:1px solid var(--cw-glass-b);box-shadow:0 20px 60px rgba(0,0,0,0.5);" +
      "font-family:'Plus Jakarta Sans',sans-serif;}" +
      "#cw-header{display:flex;align-items:center;justify-content:space-between;padding:0.9rem 1.1rem;border-bottom:1px solid var(--cw-glass-b);}" +
      "#cw-header span{font-family:'Cormorant Garamond',serif;color:var(--cw-gold-light);font-size:1.1rem;}" +
      "#cw-close{background:none;border:none;color:var(--cw-muted);cursor:pointer;font-size:1rem;}" +
      "#cw-messages{flex:1;overflow-y:auto;padding:0.9rem 1.1rem;display:flex;flex-direction:column;gap:0.6rem;}" +
      ".cw-msg{max-width:85%;padding:0.55rem 0.8rem;font-size:0.85rem;line-height:1.5;}" +
      ".cw-msg.assistant{align-self:flex-start;background:var(--cw-glass);border:1px solid var(--cw-glass-b);color:var(--cw-cream);}" +
      ".cw-msg.user{align-self:flex-end;background:linear-gradient(135deg,var(--cw-mint),var(--cw-sage));color:#fff;}" +
      "#cw-form{display:flex;gap:0.5rem;padding:0.8rem;border-top:1px solid var(--cw-glass-b);}" +
      "#cw-input{flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--cw-glass-b);color:var(--cw-cream);" +
      "padding:0.5rem 0.7rem;font-size:0.85rem;font-family:inherit;}" +
      "#cw-input::placeholder{color:var(--cw-muted);}" +
      "#cw-send{background:var(--cw-gold);border:none;color:var(--cw-forest);font-weight:600;padding:0.5rem 0.9rem;cursor:pointer;font-size:0.85rem;}" +
      "#cw-send:disabled,#cw-input:disabled{opacity:0.5;cursor:not-allowed;}";
    document.head.appendChild(style);
  }

  function addMessage(role, content) {
    var msg = el("div", { class: "cw-msg " + role, text: content });
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setLoading(state) {
    loading = state;
    input.disabled = state || done;
    sendBtn.disabled = state || done;
    // Re-focus once a response finishes loading (both the first intro
    // message and every reply after) so the visitor can keep typing
    // without clicking back into the field each turn. A disabled input
    // can't take focus, so this only fires once it's re-enabled.
    if (!state && !done) input.focus();
  }

  function openPanel() {
    toggleBtn.style.display = "none";
    panel.style.display = "flex";
    if (!sessionId) startChat();
  }

  function closePanel() {
    panel.style.display = "none";
    toggleBtn.style.display = "block";
  }

  function startChat() {
    setLoading(true);
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        sessionId = data.session_id;
        addMessage("assistant", data.reply);
        setLoading(false);
      });
  }

  function sendMessage(e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || !sessionId || loading || done) return;

    addMessage("user", text);
    input.value = "";
    setLoading(true);

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message: text }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        addMessage("assistant", data.reply);
        done = !!data.done;
        setLoading(false);
        if (done) input.placeholder = "Conversation complete";
      });
  }

  function mount() {
    injectStyles();

    toggleBtn = el("button", { id: "cw-toggle", text: "Chat with us" });
    toggleBtn.addEventListener("click", openPanel);

    var closeBtn = el("button", { id: "cw-close", text: "Close" });
    closeBtn.addEventListener("click", closePanel);

    messagesEl = el("div", { id: "cw-messages" });
    // autocomplete="off" on both the input and its form — without a `name`
    // attribute some browsers still key remembered values off `id`, which
    // showed prior answers from completely unrelated questions (email,
    // dollar amounts, yes/no) as autofill suggestions on every field.
    input = el("input", {
      id: "cw-input",
      placeholder: "Type your answer...",
      autocomplete: "off",
    });
    sendBtn = el("button", { id: "cw-send", type: "submit", text: "Send" });
    form = el("form", { id: "cw-form", autocomplete: "off" }, [input, sendBtn]);
    form.addEventListener("submit", sendMessage);

    panel = el("div", { id: "cw-panel" }, [
      el("div", { id: "cw-header" }, [el("span", { text: "Chat" }), closeBtn]),
      messagesEl,
      form,
    ]);
    panel.style.display = "none";

    document.body.appendChild(toggleBtn);
    document.body.appendChild(panel);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
