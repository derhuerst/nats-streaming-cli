#!/usr/bin/env node
'use strict'

const mri = require('mri')
const pkg = require('./package.json')

const argv = mri(process.argv.slice(2), {
	boolean: [
		'help', 'h',
		'version', 'v',
		'silent', 's',
	]
})

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    echo 'a new message' | publish-to-nats-streaming-channel <channel-name>
Options:
	--silent    -s  Don't log IDs of published messages.
	--encoding  -e  Encoding to encode the message payload with. Default: utf-8
\n`)
	process.exit(0)
}

if (argv.version || argv.v) {
	process.stdout.write(`${pkg.name} v${pkg.version}\n`)
	process.exit(0)
}

const natsStreaming = require('node-nats-streaming')
const split = require('split2')
const {Writable} = require('stream')
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

const encoding = argv.encoding || argv.e || 'utf-8'
const silent = !!(argv.silent || argv.s)

const client = createNatsStreamingClient()
client.on('error', showError)

client.once('connect', () => {
	// todo: support binary input
	process.stdin
	.once('error', showError)
	.pipe(split())
	.once('error', showError)
	.pipe(new Writable({
		objectMode: true,
		write: (msg, _, cb) => {
			client.publish(channelName, Buffer.from(msg, encoding), (err, guid) => {
				if (err) return cb(err)
				if (!silent) console.info(guid, 'published message')
				cb(null)
			})
		},
		final: cb => client.close(cb)
	}))
	.once('error', showError)

	withSoftExit(() => client.close())
})
