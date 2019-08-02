// https://gist.github.com/jlong/2428561
function parseUrl(url) {
    var parser = document.createElement('a');
    parser.href = url;
    return parser;
}

var hostData = {};
var optionsData = {};

/* Sample hostData structure:
[
    {
        incognito: false,
        hostName: "www.example.com",
        ips: [
            {
                ip: "127.0.0.1",
                active: true,
                exceptions: [777,999]
            },
            {
                ip: "4.4.4.4",
                active: false
            }
        ]
    },{
        incognito: true,
        hostName: "www.something.org",
        ips: [
            {
                ip: "8.8.8.8",
                active: false
            }
        ]
    }
]
*/

var listenUrls = [];
var requests = {};

function setListenUrls(hostData) {
    if (optionsData.incognito == "split")
        hostData = hostData.filter(rule => !!rule.incognito == chrome.extension.inIncognitoContext);
    var hostMatches = hostData.map(host => "*://" + host.hostName + "/*");
    var ipMatches = hostData.reduce((acc, cur) => [...acc, ...cur.ips.map(el => "*://" + el.ip + "/*")], []);
    var listenUrls = hostMatches.concat(ipMatches);
    if (listenUrls.length == 0)
        return ["http://www.nourlstolisten.to/"];
    return listenUrls;
}

function activateBadge(tabId) {
    chrome.browserAction.setBadgeBackgroundColor({color: "#ff7c00"});
    chrome.browserAction.setBadgeText({text:"✓", tabId});
}

function deactivateBadge(tabId) {
    chrome.browserAction.setBadgeText({text:"", tabId});
}

function onBeforeRequestListener(details) {
    //console.log("request", details);
    var parser = parseUrl(details.url);

    let hostMatch = hostData && hostData.find(host => host.hostName === parser.hostname);
    if (hostMatch) {    // we have a request for one of the hosts in the hosts file
        let ruleActive = hostMatch.ips.find(rule => rule.active != !!(rule.exceptions && rule.exceptions.includes(details.tabId)));
        // i.e. the rule is active in this tab if it's active and the tab is not an exception
        // or if it's inactive and the tab is an exception
        if (ruleActive) {
            activateBadge(details.tabId);
            // Add the host/IP/tab data to our record
            if (details.type === "main_frame") {
                requests[details.tabId] = {
                    hostname: parser.hostname,
                    ip: ruleActive.ip,
                    tabId: details.tabId,
                    requestId: details.requestId
                };
            }
            // redirect to the IP, we will add the Host header in the onBeforeSendHeaders listener
            return {
                redirectUrl: parser.protocol + "//" + ruleActive.ip + (parser.port != "" ? ":" + parser.port : "") +
                                parser.pathname + parser.search + parser.hash
            };
        }
    } else {
        // case 1: e.g. 127.0.0.1/www.example.com(/.*)?
        // look for a matching IP/hostname pair in our hosts file
        let host = hostData.find(host => parser.pathname.startsWith("/"+host.hostName) && host.ips.find(rule => rule.ip === parser.hostname));
        if (host) {
            activateBadge(details.tabId);
            // update the record
            requests[details.tabId] = {
                hostname: host.hostName,
                ip: parser.hostname,
                tabId: details.tabId,
                requestId: details.requestId
            };
            // redirect to the IP, removing the hostname from the path
            // (we will add the Host header in the onBeforeSendHeaders listener)
            return {
                redirectUrl: parser.protocol + "//" + parser.hostname + (parser.port != "" ? ":" + parser.port : "") +
                                parser.pathname.replace("/" + host.hostName, "/").replace("//", "/") + parser.search + parser.hash
            }
        }
        // case 2: e.g. 127.0.0.1(/.*)?
        // no redirect, we will manage the Host header (if needed) in the onBeforeSendHeaders listener
        return;
    }
}

function onBeforeSendHeadersListener(details) {
    if (requests[details.tabId]) {  // it's one of "those" requests
        // add the appropriate Host header
        //console.log("adding host " + requests[details.tabId].hostname);
        details.requestHeaders.push({
            name: "Host",
            value: requests[details.tabId].hostname
        });
        return {requestHeaders: details.requestHeaders};
    }
}

function resetRequestListeners() {
    chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequestListener);
    chrome.webRequest.onBeforeRequest.addListener(
        onBeforeRequestListener,
        { urls: listenUrls }, // we listen to both hostnames and IPs in our hosts file
        ["blocking"]
    );
    chrome.webRequest.onBeforeSendHeaders.removeListener(onBeforeSendHeadersListener);
    chrome.webRequest.onBeforeSendHeaders.addListener(
        onBeforeSendHeadersListener,
        { urls: listenUrls }, // we listen to both hostnames and IPs in our hosts file
        ["requestHeaders", "blocking"]
    );
}

/*var hostsKey = "livehosts";
var optionsKey = "livehostsOptions";

var defaultOptions = {
    newRuleBehaviour: "all",
    incognito: "split"
}*/

var hostsKey;
var defaultOptions;

var xhr = new XMLHttpRequest();
xhr.onreadystatechange = function() {
    if (xhr.readyState == 4 && xhr.status == 200) {

        var config = JSON.parse(xhr.responseText);
        hostsKey = config.hostsKey;
        var optionsKey = config.optionsKey;
        defaultOptions = config.defaultOptions;

        chrome.storage.sync.get([hostsKey, optionsKey], function(data) {
            
            if (!data[hostsKey])
                data[hostsKey] = [];
            if (!data[optionsKey])
                data[optionsKey] = defaultOptions;

            hostData = data[hostsKey];
            optionsData = data[optionsKey];

            listenUrls = setListenUrls(hostData);

            resetRequestListeners();

            // This is the ugly trick. We can't actually replace the URL in the address bar completely without
            // a redirect, so we settle for a not-so-subtle fallback: we add the hostname right after the IP.
            // We send the hostname as a message to the tab, and use the History API in its content script.
            chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
                if (info.status === "complete") {
                    if (requests[tabId]) {
                        activateBadge(tabId);
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

        });

        chrome.storage.onChanged.addListener(function(changes, namespace) {
            if (changes[hostsKey]) {
                hostData = changes[hostsKey].newValue;
            }
            if (changes[optionsKey]) {
                optionsData = changes[optionsKey].newValue;
            }
            if (changes[hostsKey] || changes[optionsKey]) {
                listenUrls = setListenUrls(hostData);
                resetRequestListeners();
            }
        });
    }

};

xhr.open("GET", chrome.runtime.getURL('config.json'), true);
xhr.send();

function deleteRules(filter = (r => true)) {
    hostData = hostData.filter(r => !filter(r));
    chrome.storage.sync.set({[hostsKey]: hostData});
}

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