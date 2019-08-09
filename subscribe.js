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

// todo
