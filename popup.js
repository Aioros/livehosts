var storageKey = chrome.extension.getBackgroundPage().storageKey;
console.log(storageKey);
document.addEventListener('DOMContentLoaded', function() {

    chrome.storage.sync.get(storageKey, function(data) {
        if (data[storageKey])
            document.getElementById("hosts").value = data[storageKey];
    });

    document.getElementById("save_hosts").onclick = function() {
        var hosts = document.getElementById("hosts").value;
        var data = {};
        data[storageKey] = hosts;
        chrome.storage.sync.set(data, function() {

        });
    };

});