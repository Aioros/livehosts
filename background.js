// https://gist.github.com/jlong/2428561
function parseUrl(url) {
    var parser = document.createElement('a');
    parser.href = url;
    return parser;
}

var hostData = {};
var storageKey = "livehosts";

chrome.storage.sync.get(storageKey, function(data) {
    if (data[storageKey]) {
        hostData = data[storageKey];

        var hostMatches = Object.keys(hostData).map(host => "*://" + host + "/*");
        var ipMatches = Object.values(hostData).filter(ip => ip.on).map(ip => "*://" + ip.on + "/*");

        var requests = {};

        chrome.webRequest.onBeforeRequest.addListener(function(details) {//console.log("request", details);
            var parser = parseUrl(details.url);
            
            if (hostData[parser.hostname] && hostData[parser.hostname].on) {    // we have a request for one of the hosts in the hosts file
                // Add the host/IP/tab data to our record
                if (details.type === "main_frame") {
                    requests[details.tabId] = {
                        hostname: parser.hostname,
                        ip: hostData[parser.hostname].on,
                        tabId: details.tabId,
                        requestId: details.requestId
                    };
                }
                // redirect to the IP, we will add the Host header in the onBeforeSendHeaders listener
                return {
                    redirectUrl: parser.protocol + "//" + hostData[parser.hostname].on + (parser.port != "" ? ":" + parser.port : "") +
                                    parser.pathname + parser.search + parser.hash
                };
            } else {    // we have a request for one of the IPs in the hosts file
                // case 1: e.g. 127.0.0.1/www.example.com(/.*)?
                // look for a matching IP/hostname pair in our hosts file
                let host = Object.keys(hostData).find(host => parser.hostname == hostData[host].on && parser.pathname.startsWith("/"+host));
                if (host) {
                    // update the record
                    requests[details.tabId] = {
                        hostname: host,
                        ip: hostData[host].on,
                        tabId: details.tabId,
                        requestId: details.requestId
                    };
                    // redirect to the IP, removing the hostname from the path
                    // (we will add the Host header in the onBeforeSendHeaders listener)
                    return {
                        redirectUrl: parser.protocol + "//" + hostData[host].on + (parser.port != "" ? ":" + parser.port : "") +
                                        parser.pathname.replace("/" + host, "/").replace("//", "/") + parser.search + parser.hash
                    }
                }
                // case 2: e.g. 127.0.0.1(/.*)?
                // no redirect, we will manage the Host header (if needed) in the onBeforeSendHeaders listener
                return;
            }
        }, {
            urls: hostMatches.concat(ipMatches) // we listen to both hostnames and IPs in our hosts file
        }, ["blocking"]);

        chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
            if (requests[details.tabId]) {  // it's one of "those" requests
                // add the appropriate Host header
                //console.log("adding host " + requests[details.tabId].hostname);
                details.requestHeaders.push({
                    name: "Host",
                    value: requests[details.tabId].hostname
                });
                return {requestHeaders: details.requestHeaders};
            }
        }, {
            urls: hostMatches.concat(ipMatches) // we listen to both hostnames and IPs in our hosts file
        }, ["requestHeaders", "blocking"]);

        // This is the ugly trick. We can't actually replace the URL in the address bar completely without
        // a redirect, so we settle for a not-so-subtle fallback: we add the hostname right after the IP.
        // We send the hostname as a message to the tab, and use the History API in its content script.
        chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
            if (info.status === "complete") {
                if (requests[tabId]) {
                    var host = requests[tabId].hostname;
                    chrome.tabs.sendMessage(tabId, {host: host}, function (response) {
                        if (chrome.runtime.lastError)
                            console.log(chrome.runtime.lastError);
                    });
                    // delete the completed request from our record
                    delete requests[tabId];
                }
            }
        });

        chrome.tabs.onRemoved.addListener(function(tabId, info) {
            delete requests[tabId];
        });

    }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (changes[storageKey]) {
        var hostsChange = changes[storageKey];
        hostData = changes[storageKey].newValue;
    }
});


// This part here is something that could work in the future (intercepting the request through the DevTools protocol)
// https://stackoverflow.com/a/45220932/1882497

/*chrome.debugger.getTargets((targets) => {
    let target = targets.find(t => t.tabId == 738);
    console.log(targets, target);
    let debuggee = { targetId: target.id };

    //chrome.debugger.detach(debuggee, () => {
        chrome.debugger.attach(debuggee, "1.2", () => {
            chrome.debugger.sendCommand(debuggee, "Network.setRequestInterception", { patterns: [{ urlPattern: '*' }] });
        });
    //});

    chrome.debugger.onEvent.addListener((source, method, params) => {console.log("intercepted");
        if (source.targetId === target.id && method === "Network.requestIntercepted") {
            console.log(params);
        }
    });
});*/