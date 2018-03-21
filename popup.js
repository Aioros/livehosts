var storageKey = chrome.extension.getBackgroundPage().storageKey;

function updateHosts(callback) {
    chrome.storage.sync.get(storageKey, function(data) {
        if (data[storageKey]) {
            document.getElementById("hosts").value = JSON.stringify(data[storageKey]);
            let placeholder = document.getElementById("host_placeholder");
            let host = placeholder.cloneNode(true);
            document.querySelectorAll('.host:not(.placeholder)').forEach(function(a){
                a.remove()
            });
            Object.keys(data[storageKey]).forEach(function(hostname) {
                host.id = "";
                host.querySelector('.host-name').value = hostname;
                if (data[storageKey][hostname].on) {
                    let entry = host.querySelector('.host-ip-entry.placeholder').cloneNode(true);
                    entry.querySelector('.on').checked = "checked";
                    entry.querySelector('.host-ip').value = data[storageKey][hostname].on;
                    entry.classList.remove("placeholder");
                    host.querySelector('.host-ips').appendChild(entry);
                }
                if (data[storageKey][hostname].off) {
                    data[storageKey][hostname].off.forEach(function(offIp) {
                        let entry = host.querySelector('.host-ip-entry.placeholder').cloneNode(true);
                        entry.querySelector('.host-ip').value = offIp;
                        entry.classList.remove("placeholder");
                        host.querySelector('.host-ips').appendChild(entry);
                    });
                }
                host.classList.remove("placeholder");
                placeholder.parentNode.appendChild(host);
            });
        }
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

    document.getElementById("save_hosts").onclick = function() {
        var hosts = document.getElementById("hosts").value;
        var data = {};
        data[storageKey] = hosts.length == 0 ? {} : JSON.parse(hosts);
        chrome.storage.sync.set(data, updateHosts);
    };

});