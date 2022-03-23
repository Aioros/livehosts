<script>
export default {
	props: ["hostName", "ip"],
	emits: ["update:hostName", "update:ip", "addRule"]
}
</script>
<template>
		<form>
		<div class="form-group form-row">
			<div class="col-6">
				<input
					type="text"
					class="form-control form-control-sm"
					id="new_host_name"
					placeholder="Hostname"
					:value="hostName"
					@input="$emit('update:hostName', $event.target.value)"
				/>
			</div>
			<div class="col-4">
				<input
					type="text"
					class="form-control form-control-sm"
					id="new_ip"
					placeholder="IP"
					:value="ip"
					@input="$emit('update:ip', $event.target.value)"
				/>
			</div>
			<div class="col-2 text-center">
				<button
					class="btn btn-primary btn-sm"
					@click.prevent="$emit('addRule', hostName, ip)"
				>Add</button>
			</div>
		</div>
	</form>
	<!--slot /-->
</template>