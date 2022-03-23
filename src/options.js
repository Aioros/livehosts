import { config } from "./config.js"

var optionsKey = config.optionsKey;
var previousIncognito = null;

function showStatus(statusMessage) {
  var status = document.getElementById("status");
  status.textContent = statusMessage;
  setTimeout(function() {
    status.textContent = '';
  }, 2000);
}

function checkWarning(incognito) {
  if (previousIncognito != incognito) {
    document.getElementById("hint_incognito").classList.remove("hidden");
  } else {
    document.getElementById("hint_incognito").classList.add("hidden");
  }
}

function saveOptions() {
  var newRuleBehaviour = document.querySelector('input[name="new_rule_behaviour"]:checked').value;
  var incognito = document.querySelector('input[name="incognito"]:checked').value;

  chrome.storage.sync.set({
    [optionsKey]: {
      newRuleBehaviour,
      incognito
    }
  }, function() {
    showStatus("Options saved.");
    previousIncognito = incognito;
    checkWarning(incognito);
  });
}

function restoreOptions() {
  chrome.storage.sync.get(optionsKey, function(items) {
    var items = Object.assign(
      {},
      config.defaultOptions,
      items[optionsKey]
    );
    document.querySelector('input[name="new_rule_behaviour"][value="'+items.newRuleBehaviour+'"]').checked = true;
    document.querySelector('input[name="incognito"][value="'+items.incognito+'"]').checked = true;
    previousIncognito = items.incognito;
  });
}

function deleteOptions() {
  chrome.storage.sync.remove(optionsKey, function() {
    restoreOptions();
    showStatus("Options reset.");
  });
}

function deleteRules() {
  if (confirm("Are you sure you want to delete all host rules?")) {
    chrome.extension.getBackgroundPage().deleteRules();
  }
}

for (let i of document.querySelectorAll('input[name="incognito"]')) {
  i.addEventListener("click", function() {
    checkWarning(i.value);
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
document.getElementById("delete").addEventListener("click", deleteOptions);
document.getElementById("delete_rules").addEventListener("click", deleteRules);