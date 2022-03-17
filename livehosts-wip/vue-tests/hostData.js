import HostRule from './hostRule.js'

export default {
	data() {
		return {
			hostRules: [
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
		}
	},
	components: {
		HostRule
	},
	template: `
		<h1>Root component (HostData)</h1>
		<h2>Here the new rule component I guess</h2>
		<HostRule
			v-for="hostRule in hostRules"
			v-bind="hostRule"
		></HostRule>
	`
}