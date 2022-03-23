<script>
export default {
	props: ["incognito", "hostName", "ips", "currentTab"],
	emits: ["update:hostName", "deleteRule"],
	methods: {
		setThisTabOnly(ipRule) {
			ipRule.exceptions ||= [];
			if (ipRule.exceptions.includes(this.currentTab)) {
				ipRule.exceptions = ipRule.exceptions.filter(el => el !== this.currentTab)
			} else {
				ipRule.exceptions.push(this.currentTab);
			}
			if (ipRule.exceptions.length === 0) {
				delete ipRule.exceptions;
			}
		},
		setAllTabs(ipRule) {
			delete ipRule.exceptions;
			if (!ipRule.active) {
				this.ips.forEach((rule) => {
					if (rule.ip !== ipRule.ip) {
						rule.active = false;
						delete rule.exceptions;
					}
				});
			}
		}
	}
}
</script>
<template>
	<div class="form-group row">
		<div class="col">
			<div class="form-row">
				<div class="col-6">
					<input
						type="text"
						class="form-control form-control-sm"
						:value="hostName"
						@input="$emit('update:hostName', $event.target.value)"
					/>
				</div>
			</div>
			<div class="row" v-for="ipRule in ips">
				<div class="col-7 pl-5 ip">
					<input
						type="text"
						class="form-control form-control-sm"
						v-model="ipRule.ip"
					/>
				</div>
				<div class="col-2 form-check form-check-inline mr-0">
					<input
						class="form-check-input"
						name="this-tab"
						type="checkbox"
						@click="setThisTabOnly(ipRule)"
						:checked="ipRule.active == !(ipRule.exceptions?.includes(this.currentTab))"
					/>
					<label class="form-check-label" for="this-tab">This tab</label>
				</div>
				<div class="col-2 form-check form-check-inline mr-0">
					<input
						class="form-check-input"
						name="all-tabs"
						type="checkbox"
						@click="setAllTabs(ipRule)"
						v-model="ipRule.active"
					/>
					<label class="form-check-label" for="all-tabs">All tabs</label>
				</div>
				<div class="col-1">
					<button @click="$emit('deleteRule', hostName, ipRule.ip)" type="button" class="btn btn-sm close">×</button>
				</div>
			</div>
		</div>
	</div>
	<!--slot /-->
</template>