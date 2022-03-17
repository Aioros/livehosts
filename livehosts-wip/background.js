import { config } from "./config.js";

/*function parseUrl(url) {
    var parser = document.createElement('a');
    parser.href = url;
    return parser;
}*/

var hostsKey = config.hostsKey;
var optionsKey = config.optionsKey;
var defaultOptions = config.defaultOptions;

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
/* Sample dynamic rule:
{
    id: 2,
    action: {type: "redirect"},
    condition: {urlFilter: "||example.com", excludedResourceTypes: ["other"]}
}
*/

// TODO: remember to clean up unused tab ids in rule exceptions

async function rebuildSessionRules(hostData, optionsData) {
    var oldRuleIds = (await chrome.declarativeNetRequest.getDynamicRules()).map(r => r.id);

    var newRules = [];
    var counter = 1;
    for (hostRule of hostData) {
        if (hostRule.incognito == chrome.extension.inIncognitoContext || optionsData.incognito == "share") {
            for (ipRule of hostRule.ips) {
                if (ipRule.active || ipRule.exceptions) {
                    var newRule = {
                        id: counter,
                        action: {
                            type: "redirect",
                            redirect: {
                                url: ipRule.ip
                            }
                        },
                        condition: {
                            urlfilter: hostRule.hostName,
                            excludedResourceTypes: ["other"]
                        }
                    };
                    if (ipRule.active && ipRule.exceptions?.length) {
                        newRule.condition.excludedTabIds = ipRule.exceptions;
                    } else if (!ipRule.active && ipRule.exceptions?.length) {
                        newRule.condition.tabIds = ipRule.exceptions;
                    }
                    newRules.push(newRule);
                    counter++;
                }
            }
        }
    };

    await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: oldRuleIds,
        addRules: newRules
    });
}

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
    console.log("request", details);
    var parser = new URL(details.url);

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
        console.log("adding host " + requests[details.tabId].hostname);
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
        ["requestHeaders", "extraHeaders", "blocking"]
    );
}

chrome.storage.sync.get([hostsKey, optionsKey], function(data) {
    
    hostData = data[hostsKey] || [];
    optionsData = data[optionsKey] || defaultOptions;

    //listenUrls = setListenUrls(hostData);
    //resetRequestListeners();

    // Recreate the dynamic rules according to our hostData
    rebuildSessionRules(hostData, optionsData);

});

// This is the ugly trick. We can't actually replace the URL in the address bar completely without
// a redirect, so we settle for a not-so-subtle fallback: we add the hostname right after the IP.
// We send the hostname to the tab, and use the History API in its injected script.
chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
    if (info.status === "complete") {
        if (requests[tabId]) {
            activateBadge(tabId);
            var host = requests[tabId].hostname;
            chrome.scripting.executeScript({
                target: { tabId },
                function: (host) => {
                    window.history.replaceState({}, "", "/" + host + location.pathname + location.search + location.hash);
                },
                args: [host]
            });
            // delete the completed request from our record
            delete requests[tabId];
        }
    }
});

chrome.tabs.onRemoved.addListener(function(tabId, info) {
    delete requests[tabId];
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

// chrome.declarativeNetRequest.updateSessionRules({
//     removeRuleIds: [2],
//     addRules: [{
//         id: 2,
//         action: {type: "block"},
//         condition: {urlFilter: "||example.com", excludedResourceTypes: ["other"]}
//     }]
// }).then(() => {
//     console.log("done");
//     return chrome.declarativeNetRequest.getSessionRules();
// }).then(console.log);

chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(console.log);

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