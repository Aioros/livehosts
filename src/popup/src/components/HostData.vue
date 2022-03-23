<script>
import HostRule from "./HostRule.vue";
import NewRule from "./NewRule.vue";
import { config } from "../../../config.js";

export default {
	data() {
		return {
			options: config.defaultOptions,
			hostRules: [],
			newHostRule: {
				hostName: "",
				ip: ""
			},
			originalStringifiedRules: null,
			currentTab: null
		}
	},
	computed: {
        stringifiedHostRules: function() {
            return JSON.stringify(this.hostRules);
        },
        dirty: function() {
        	return this.stringifiedHostRules != this.originalStringifiedRules;
        }
    },
	watch: {
		stringifiedHostRules: {
			handler(newStringifiedRules, oldStringifiedRules) {
				if (!this.originalStringifiedRules) {
					this.originalStringifiedRules = oldStringifiedRules;
				}
			},
			deep: true
		}
	},
	async created() {
		var hostRules = await chrome.storage.sync.get(config.hostsKey);
		hostRules = hostRules[config.hostsKey] || [];

		var existingTabIds = (await chrome.tabs.query({})).map(tab => tab.id);
		for (let hostRule of hostRules) {
			for (let ipRule of hostRule.ips) {
				if (ipRule.exceptions) {
					ipRule.exceptions = ipRule.exceptions.filter((ex) => existingTabIds.includes(ex));
				}
			}
		}

		this.hostRules = hostRules;
		this.originalStringifiedRules = JSON.stringify(this.hostRules);

		var options = await chrome.storage.sync.get(config.optionsKey);
		this.options = options[config.optionsKey] || config.defaultOptions;

		var currentTab = await chrome.tabs.query({currentWindow: true, active : true});
		this.currentTab = currentTab[0].id;
	},
	methods: {
		cancelEdits() {
			this.hostRules = JSON.parse(this.originalStringifiedRules);
		},
		saveEdits() {
			var stringifiedRules = JSON.stringify(this.hostRules);
			this.originalStringifiedRules = stringifiedRules;
			chrome.storage.sync.set({[config.hostsKey]: JSON.parse(stringifiedRules)});
		},
		addRule(hostName, ip) {
			if (hostName.length > 0 && ip.length > 0) {
				var ipRule = {ip: ip};
				if (this.options.newRuleBehaviour == "this") { // active in this tab only
					ipRule.active = false;
					ipRule.exceptions = [this.currentTab];
				} else { // active in all tabs
					ipRule.active = true;
				}
				var existingHost = this.hostRules.find(host => 
					host.hostName === hostName 
					&&
					(this.options.incognito == "share" || !!host.incognito == chrome.extension.inIncognitoContext)
				);
				if (!existingHost) {
					this.hostRules.push({
						hostName: hostName,
						ips: [ipRule],
						incognito: chrome.extension.inIncognitoContext
					});
				} else {
					let existingIp = existingHost.ips.find(rule => rule.ip === ip);
					if (!existingIp) {
						existingHost.ips.push(ipRule);
					}
				}
				this.newHostRule.hostName = "";
				this.newHostRule.ip = "";
			}
		},
		deleteRule(hostName, ip) {
			var hostRule = this.hostRules.find(hr => hr.hostName == hostName);
			hostRule.ips = hostRule.ips.filter(ipr => ipr.ip != ip);
			if (hostRule.ips.length == 0) {
				this.hostRules = this.hostRules.filter(h => h.hostName != hostName);
			}
		}
	},
	components: {
		NewRule,
		HostRule
	}
}
</script>

<template>
	<div class="container-fluid mt-3">
		<NewRule
			v-model:host-name="newHostRule.hostName"
			v-model:ip="newHostRule.ip"
			@add-rule="addRule"
		></NewRule>
		<form name="hostForm">
			<div v-if="dirty" class="changed text-center mt-n1 mb-3">
				<button
					type="button"
					class="btn btn-success btn-sm save mr-1"
					@click.prevent="saveEdits"
				>Save</button>
				<button
					type="button"
					class="btn btn-danger btn-sm cancel"
					@click.prevent="cancelEdits"
				>Cancel</button>
			</div>
			<div class="hosts">
				<HostRule
					v-for="hostRule in hostRules"
					v-model:host-name="hostRule.hostName"
					v-model:ips="hostRule.ips"
					:current-tab="this.currentTab"
					@delete-rule="deleteRule"
				></HostRule>
			</div>
		</form>
	</div>
</template>