#!/usr/bin/env node
'use strict'

const mri = require('mri')
const pkg = require('./package.json')

const argv = mri(process.argv.slice(2), {
	boolean: [
		'help', 'h',
		'version', 'v',
		'raw',
		'json',
	]
})

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    nats-streaming-stats
Options:
	--json                Format data as JSON.
	--raw                 Print raw NATS Streaming response.
Example:
    nats-streaming-stats
\n`)
	process.exit(0)
}

if (argv.version || argv.v) {
	process.stdout.write(`${pkg.name} v${pkg.version}\n`)
	process.exit(0)
}

const fetch = require('node-fetch')
const Table = require('cli-table3')

const showError = (err) => {
	console.error(err)
	process.exit(1)
}

const minimalTable = (head) => {
	return new Table({
		head,
		chars: {
			'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
			'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
			'left': '', 'left-mid': '',
			'right': '', 'right-mid': '',
			'mid': '', 'mid-mid': '', 'middle': ' ',
		},
	})
}

const natsStreamingStatsUrl = process.env.NATS_URL || 'http://localhost:8222/'

;(async () => {
	// const url = natsStreamingStatsUrl + 'streaming/clientsz?subs=1'
	const url = natsStreamingStatsUrl + 'streaming/channelsz?subs=1'

	const res = await fetch(url, {
		cache: 'no-store',
		headers: {
			'user-agent': pkg.homepage,
		},
		redirect: 'follow',
	})
	if (!res.ok) {
		const err = new Error(res.statusText)
		err.status = res.status
		err.url = res.url
		err.res = res
		throw err
	}
	const _ = await res.json()

	if (argv.raw) {
		process.stdout.write(JSON.stringify(_))
		process.exit(0)
	}

	// todo: follow pagination using _.total & _.count

	const channels = (_.channels || [])
	.map(c => ({
		name: c.name,
		messages: c.msgs,
		bytes: c.bytes,
		firstMsgSeq: c.first_seq, latestMsgSeq: c.last_seq,
	}))

	const subscriptions = (_.channels || [])
	.reduce((subs, c) => { // flatMap
		return subs.concat((c.subscriptions || []).map(s => [s, c]))
	}, [])
	.map(([s, c]) => ({
		channel: c.name,
		clientId: s.client_id,

		isStalled: s.is_stalled,
		latestMsgSeq: s.last_sent,
		pendingMsgs: s.pending_count,
		offline: s.is_offline,

		// todo: s.inbox, s.ack_inbox?
		queueName: s.queue_name,
		durable: s.is_durable,
		maxInflightMsgs: s.max_inflight,
		ackWait: s.ack_wait,
	}))

	if (argv.json) {
		process.stdout.write(JSON.stringify({
			channels,
			subscriptions,
		}))
		process.exit(0)
	}

	console.log('channels')
	const channelsT = minimalTable([
		'name',
		'messages',
		'bytes',
		'first msg seq',
	])
	for (const channel of channels) channelsT.push(Object.values(channel))
	console.log(channelsT.toString())

	console.log('\nsubscriptions')
	const subsT = minimalTable([
		'channel',
		'client ID',
		'stalled?',
		'latest msg seq',
		'pending msgs',
		'offline?',
		'queue',
		'durable?',
		'max inflight msgs',
		'ack wait',
	])
	for (const sub of subscriptions) {
		subsT.push(Object.values(sub))
	}
	console.log(subsT.toString())
})()
.catch(showError)
