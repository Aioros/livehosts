var storageKey = chrome.extension.getBackgroundPage().storageKey;

function updateHosts(callback) {
    chrome.storage.sync.get(storageKey, function(data) {
        if (data[storageKey])
            document.getElementById("hosts").value = JSON.stringify(data[storageKey]);
        callback(data[storageKey]);
    });
}

document.addEventListener('DOMContentLoaded', function() {

    updateHosts();

    document.getElementById("add_host").onclick = function() {
        var hostname = document.getElementById("new_host_name").value;
        var ip = document.getElementById("new_host_ip").value;
        if (ip != "" && hostname != "") {
            chrome.storage.sync.get(storageKey, function(data) {
                if (data[storageKey]) {
                    if (data[storageKey][hostname]) {
                        if (!data[storageKey][hostname].off)
                            data[storageKey][hostname].off = [];
                        data[storageKey][hostname].off.push(data[storageKey][hostname].on);
                        data[storageKey][hostname].on = ip;
                    } else {
                        data[storageKey][hostname] = {on: ip};
                    }
                    data[storageKey][hostname].on = ip;
                } else {
                    data[storageKey] = {};
                    data[storageKey][hostname] = {on: ip};
                }
                chrome.storage.sync.set(data, updateHosts);
            });
        }
    };

    /*document.getElementById("save_hosts").onclick = function() {
        var hosts = document.getElementById("hosts").value;
        var data = {};
        data[storageKey] = hosts;
        chrome.storage.sync.set(data, function() {

        });
    };*/

});