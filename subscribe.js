#!/usr/bin/env node
'use strict'

const mri = require('mri')
const pkg = require('./package.json')

const argv = mri(process.argv.slice(2), {
	boolean: [
		'help', 'h',
		'version', 'v',
		'ack', 'a',
		'metadata', 'm'
	]
})

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    subscribe-to-nats-streaming-channel <channel-name>
Options:
	--start     -s  Start with the message having this sequence nr.
	--encoding  -e  Encoding to decode the message payload with. Default: utf-8
	--format    -f  How to format the messages. json, raw, inspect (default)
	--ack       -a  Acknowledge the messages received.
	--metadata  -m  Print the message payload along its metadata.
\n`)
	process.exit(0)
}

if (argv.version || argv.v) {
	process.stdout.write(`${pkg.name} v${pkg.version}\n`)
	process.exit(0)
}

const {inspect} = require('util')
const {isatty} = require('tty')
const createNatsStreamingClient = require('./lib/client')
const withSoftExit = require('./soft-exit')

const showError = (err) => {
	console.error(err)
	process.exit(1)
}

const channelName = argv._[0]
if ('string' !== typeof channelName || !channelName) {
	showError('channel-name must be a non-empty string.')
}

const start = (
	'number' === typeof argv.start ? argv.start : (
		'number' === typeof argv.s ? argv.s : null
	)
)
const encoding = argv.encoding || argv.e || 'utf-8'
const metadata = argv.metadata || argv.m

const inspectWithColor = isatty(process.stdout.fd)
const formats = Object.assign(Object.create(null), {
	json: val => JSON.stringify(val),
	raw: val => val + '',
	inspect: val => inspect(val, {depth: null, colors: inspectWithColor})
})
const format = formats[argv.format || argv.f] || formats.inspect
const ack = argv.ack || argv.a

const client = createNatsStreamingClient()
client.on('error', showError)

client.once('connect', () => {
	const queueGroup = process.env.NATS_QUEUE_GROUP || Math.random().toString(16).slice(2)

	let subOpts = client
	.subscriptionOptions()
	.setManualAckMode(true)
	.setDurableName(queueGroup)
	if (start !== null) {
		subOpts = subOpts.setStartAtSequence(start)
	}
	// todo: setStartTime

	const subscription = client.subscribe(channelName, queueGroup, subOpts)
	subscription
	.on('message', (msg) => {
		const data = msg.getData().toString(encoding)
		const item = metadata ? {
			channelName: msg.getSubject(),
			timestamp: msg.getTimestamp(),
			sequence: msg.getSequence(),
			data
		} : data

		process.stdout.write(format(item) + '\n')
		if (ack) msg.ack()
	})

	withSoftExit(() => client.close())
})
