console.log('Content script loaded');

function injectScript() {
  // Inject the extension ID
  let idScript = document.createElement("script");
  idScript.setAttribute("type", "application/javascript");
  idScript.textContent = 'var myExtId = "' + chrome.runtime.id +'";';
  (document.head || document.documentElement).appendChild(idScript);

  // Inject the main script
  let script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  (document.head || document.documentElement).appendChild(script);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "injectScript") {
    injectScript();
  }
});

console.log('Content script setup complete');