var storageKey = chrome.extension.getBackgroundPage().storageKey;

function hostInfoToId(hostname, ip) {
    return hostname.replace(/\W/g, "_") + "_" + ip.replace(/\W/g, "_");
}

function updateHostsView(hostData) {
    document.getElementById("hosts").value = JSON.stringify(hostData);
    let placeholder = document.getElementById("host_placeholder");
    document.querySelectorAll('.host:not(.placeholder)').forEach(function(a){
        a.remove()
    });
    Object.keys(hostData).forEach(function(hostname) {
        let host = placeholder.cloneNode(true);
        host.id = "";
        host.dataset.hostname = hostname;
        host.querySelector('.host-name').value = hostname;
        if (hostData[hostname].on) {
            let entry = host.querySelector('.host-ip-entry.placeholder').cloneNode(true);
            let checkbox = entry.querySelector('.on');
            checkbox.id = hostInfoToId(hostname, hostData[hostname].on);
            checkbox.parentNode.dataset.hostname = hostname;
            checkbox.parentNode.dataset.ip = hostData[hostname].on;
            checkbox.checked = "checked";
            entry.querySelector('.host-ip').value = hostData[hostname].on;
            entry.classList.remove("placeholder");
            host.querySelector('.host-ips').appendChild(entry);
        }
        if (hostData[hostname].off) {
            hostData[hostname].off.forEach(function(offIp) {
                let entry = host.querySelector('.host-ip-entry.placeholder').cloneNode(true);
                let checkbox = entry.querySelector('.on');
                checkbox.id = hostInfoToId(hostname, offIp);
                checkbox.parentNode.dataset.hostname = hostname;
                checkbox.parentNode.dataset.ip = offIp;
                entry.querySelector('.host-ip').value = offIp;
                entry.classList.remove("placeholder");
                host.querySelector('.host-ips').appendChild(entry);
            });
        }
        host.classList.remove("placeholder");
        placeholder.parentNode.appendChild(host);
    });
}

document.addEventListener('DOMContentLoaded', function() {

    chrome.storage.sync.get(storageKey, function(data) {
        if (data[storageKey]) {
            updateHostsView(data[storageKey]);
        }
    });

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
                chrome.storage.sync.set(data, updateHostsView(data[storageKey]));
            });
        }
    };

    document.getElementById("save_hosts").onclick = function() {
        var hosts = document.getElementById("hosts").value;
        var data = {};
        data[storageKey] = hosts.length == 0 ? {} : JSON.parse(hosts);
        chrome.storage.sync.set(data, updateHostsView(data[storageKey]));
    };

    document.getElementById("hosts_list").addEventListener('change', function(event) {
        var elem = event.target;

        chrome.storage.sync.get(storageKey, function(data) {
            if (data[storageKey]) {
                if (elem.type == "checkbox") {
                    let host = data[storageKey][elem.parentNode.dataset.hostname];
                    if (elem.checked) {
                        if (host.on)
                            host.off.push(host.on);
                        host.off = host.off.filter(ip => ip !== elem.parentNode.dataset.ip);
                        host.on = elem.parentNode.dataset.ip;
                    } else {
                        host.off.push(host.on);
                        delete host.on;
                    }
                } else if (elem.type == "text") {
                    let host = data[storageKey][elem.parentNode.dataset.hostname];
                    host.on = host.on.replace(elem.parentNode.dataset.ip, elem.value);
                    host.off = host.off.map(ip => ip.replace(elem.parentNode.dataset.ip, elem.value));
                }
                chrome.storage.sync.set(data, updateHostsView(data[storageKey]));
            }
        });
        
    });

    document.getElementById("hosts_list").addEventListener('click', function(event) {
        if (event.target.className == "host-delete") {
            chrome.storage.sync.get(storageKey, function(data) {
                if (data[storageKey]) {
                    delete data[storageKey][event.target.parentNode.dataset.hostname];
                    chrome.storage.sync.set(data, updateHostsView(data[storageKey]));
                }
            });
        }
    });

});