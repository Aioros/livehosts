export default {
	/*data() {
		return { test: 3 }
	},*/
	props: ["incognito", "hostName", "ips"],
	template: `
		<div>Host Name: {{hostName}}</div>
		<ul>
			<li v-for="ipRule in ips">{{ipRule.ip}}</li>
		</ul>
	`
}