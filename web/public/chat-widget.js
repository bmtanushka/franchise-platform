/*
 * Standalone chat widget for the franchisor's static corporate site
 * (web/src/corporate-site/), which is served as raw HTML and never goes
 * through React — so the React ChatWidget component (used on franchisee
 * sites) can't mount here. This talks to the same /api/chat proxy with
 * the same {session_id, message} contract; styling reuses the corporate
 * site's own CSS custom properties (--forest, --gold, etc.) so it looks
 * native rather than bolted on.
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
      "#cw-toggle{position:fixed;bottom:1.5rem;right:1.5rem;z-index:1000;padding:0.85rem 1.5rem;border:none;border-radius:999px;cursor:pointer;" +
      "background:linear-gradient(135deg,var(--mint,#4a9e78),var(--sage,#2a5240));color:#fff;font-family:'Plus Jakarta Sans',sans-serif;" +
      "font-size:0.85rem;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.35);}" +
      "#cw-toggle:hover{filter:brightness(1.08);}" +
      "#cw-panel{position:fixed;bottom:1.5rem;right:1.5rem;z-index:1000;width:320px;height:26rem;display:flex;flex-direction:column;" +
      "background:var(--forest,#182e24);border:1px solid var(--glass-b,rgba(201,168,76,0.18));box-shadow:0 20px 60px rgba(0,0,0,0.5);" +
      "font-family:'Plus Jakarta Sans',sans-serif;}" +
      "#cw-header{display:flex;align-items:center;justify-content:space-between;padding:0.9rem 1.1rem;border-bottom:1px solid var(--glass-b,rgba(201,168,76,0.18));}" +
      "#cw-header span{font-family:'Cormorant Garamond',serif;color:var(--gold-light,#e8cc80);font-size:1.1rem;}" +
      "#cw-close{background:none;border:none;color:var(--muted,#7a8e83);cursor:pointer;font-size:1rem;}" +
      "#cw-messages{flex:1;overflow-y:auto;padding:0.9rem 1.1rem;display:flex;flex-direction:column;gap:0.6rem;}" +
      ".cw-msg{max-width:85%;padding:0.55rem 0.8rem;font-size:0.85rem;line-height:1.5;}" +
      ".cw-msg.assistant{align-self:flex-start;background:var(--glass,rgba(255,255,255,0.05));border:1px solid var(--glass-b,rgba(201,168,76,0.18));color:var(--cream,#f5f0e8);}" +
      ".cw-msg.user{align-self:flex-end;background:linear-gradient(135deg,var(--mint,#4a9e78),var(--sage,#2a5240));color:#fff;}" +
      "#cw-form{display:flex;gap:0.5rem;padding:0.8rem;border-top:1px solid var(--glass-b,rgba(201,168,76,0.18));}" +
      "#cw-input{flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--glass-b,rgba(201,168,76,0.18));color:var(--cream,#f5f0e8);" +
      "padding:0.5rem 0.7rem;font-size:0.85rem;font-family:inherit;}" +
      "#cw-input::placeholder{color:var(--muted,#7a8e83);}" +
      "#cw-send{background:var(--gold,#c9a84c);border:none;color:var(--forest,#182e24);font-weight:600;padding:0.5rem 0.9rem;cursor:pointer;font-size:0.85rem;}" +
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
    input = el("input", { id: "cw-input", placeholder: "Type your answer..." });
    sendBtn = el("button", { id: "cw-send", type: "submit", text: "Send" });
    form = el("form", { id: "cw-form" }, [input, sendBtn]);
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
