chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.host) {
        window.history.replaceState({}, "", "/" + message.host + location.pathname + location.search + location.hash);
    }
    sendResponse({});
});

