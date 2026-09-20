<template>
	<Admonition
		type="info"
		:header="formatMessage(messages.offlineMultiplayerQuirkHeader)"
		:dismissible="dismissible"
		@dismiss="emit('dismiss')"
	>
		{{ formatMessage(messages.offlineMultiplayerQuirkBody) }}
	</Admonition>
</template>

<script setup lang="ts">
import { Admonition, useVIntl } from '@modrinth/ui'

import { instanceAdmonitionsMessages as messages } from './messages'

defineProps<{ dismissible?: boolean }>()
const emit = defineEmits<{ dismiss: [] }>()

const { formatMessage } = useVIntl()
</script>
