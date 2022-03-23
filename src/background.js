import { config } from "./config.js";

var hostsKey = config.hostsKey;
var optionsKey = config.optionsKey;
var defaultOptions = config.defaultOptions;

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

async function findMappedHost(ip, tabId) {
    var hostData = await chrome.storage.sync.get(config.hostsKey);
    hostData = hostData[config.hostsKey] || [];
    var activeRule = hostData.find(
        hostRule => hostRule.ips.find(
            ipRule => ipRule.ip == ip && ipRule.active == !(ipRule.exceptions?.includes(tabId))
        )
    );
    return activeRule?.hostName;
}

async function rebuildSessionRules(hostData, optionsData) {
    var oldRuleIds = (await chrome.declarativeNetRequest.getSessionRules()).map(r => r.id);

    var newRules = [];
    var counter = 1;
    for (let hostRule of hostData) {
        if (hostRule.incognito == chrome.extension.inIncognitoContext || optionsData.incognito == "share") {
            for (let ipRule of hostRule.ips) {
                if (ipRule.active || ipRule.exceptions) {
                    var newRedirectRule = {
                        id: counter++,
                        action: {
                            type: "redirect",
                            redirect: {
                                regexSubstitution: `\\1://${ipRule.ip}/\\4`
                            }
                        },
                        condition: {
                            regexFilter: `(.*)://(${ipRule.ip}/)?(${hostRule.hostName})/(.*)`,
                            resourceTypes: [
                                "main_frame","sub_frame","stylesheet","script","image","font","object",
                                "xmlhttprequest","ping","csp_report","media","websocket","webtransport",
                                "webbundle","other"
                            ]
                        }
                    };
                    var newModifyHeadersRule = {
                        id: counter++,
                        action: {
                            type: "modifyHeaders",
                            requestHeaders: [{
                                header: "Host",
                                operation: "set",
                                value: hostRule.hostName
                            }]
                        },
                        condition: {
                            urlFilter: "||" + ipRule.ip,
                            resourceTypes: [
                                "main_frame","sub_frame","stylesheet","script","image","font","object",
                                "xmlhttprequest","ping","csp_report","media","websocket","webtransport",
                                "webbundle","other"
                            ]
                        }
                    };
                    if (ipRule.active && ipRule.exceptions?.length) {
                        newRedirectRule.condition.excludedTabIds = ipRule.exceptions;
                        newModifyHeadersRule.condition.excludedTabIds = ipRule.exceptions;
                    } else if (!ipRule.active && ipRule.exceptions?.length) {
                        newRedirectRule.condition.tabIds = ipRule.exceptions;
                        newModifyHeadersRule.condition.tabIds = ipRule.exceptions;
                    }
                    newRules.push(newRedirectRule);
                    newRules.push(newModifyHeadersRule);
                }
            }
        }
    };

    await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: oldRuleIds,
        addRules: newRules
    });
}

chrome.storage.sync.get([hostsKey, optionsKey], function(data) {
    
    var hostData = data[hostsKey] || [];
    var optionsData = data[optionsKey] || defaultOptions;

    // Recreate the dynamic rules according to our hostData
    rebuildSessionRules(hostData, optionsData);

});

// This is the ugly trick. We can't actually replace the URL in the address bar completely without
// a redirect, so we settle for a not-so-subtle fallback: we add the hostname right after the IP.
// We send the hostname to the tab, and use the History API in its injected script.
async function onTabUpdated(tab) {
    // We use the badge text to keep track of tabs we already processed
    var badgeText = await chrome.action.getBadgeText({tabId: tab.id});
    if (badgeText != "✓") {
        var host = await findMappedHost((new URL(tab.url)).host, tab.id);
        // If we found an active mapping, then we can assume that this tab matched a rule
        if (host) {
            await chrome.action.setBadgeText({text:"✓", tabId: tab.id});
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: (host) => {
                    window.history.replaceState({}, "", "/" + host + location.pathname + location.search + location.hash);
                },
                args: [host]
            });
        }
    }
}

chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
    if (info.status === "complete") {
        onTabUpdated(tab);
    }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (changes[hostsKey]) {
        var hostData = changes[hostsKey].newValue;
    }
    if (changes[optionsKey]) {
        var optionsData = changes[optionsKey].newValue;
    }
    if (changes[hostsKey] || changes[optionsKey]) {
        rebuildSessionRules(hostData, optionsData);
    }
});

chrome.declarativeNetRequest.setExtensionActionOptions({
    displayActionCountAsBadgeText: true
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