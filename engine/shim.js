// Minimal stand-ins for the chrome.* extension APIs the SelectorsHub content
// scripts reference. Outside the extension there is no background page or
// panel to talk to, so messaging and storage are silent no-ops. The engine's
// locator-generation functions are pure DOM code and run unchanged.
var __noop = function () {};
var chrome = {
  runtime: {
    id: "selectorshub-mcp",
    sendMessage: __noop,
    onMessage: { addListener: __noop, removeListener: __noop },
  },
  storage: {
    local: { get: __noop, set: __noop, remove: __noop },
    sync: { get: __noop, set: __noop, remove: __noop },
  },
  dom: {
    openOrClosedShadowRoot: function (el) {
      return el && el.shadowRoot ? el.shadowRoot : null;
    },
  },
};
var browser = chrome;
