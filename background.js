chrome.browserAction.onClicked.addListener(function(tab) {
    console.log('Extension icon clicked');
    chrome.tabs.sendMessage(tab.id, {action: "injectScript"});
  });
  
  chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    console.log("Received message from " + sender.url + ": ", request);
    if (request.action === "extractedData") {
      console.log("Extracted data:", request.data);
      // You can process the data here or send it to the content script
      sendResponse({ received: true });
    }
  });