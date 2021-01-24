'use strict'

const withSoftExit = (softExit) => {
	let softExiting = false
	const onExitSignal = () => {
		// If soft exit is running or didn't work, exit forcefully.
		if (softExiting) {
			process.exit()
			return;
		}

		softExit()
		softExiting = true
		setTimeout(() => process.exit(), 1500).unref()
	}

	process.on('SIGINT', onExitSignal)
	process.on('SIGTERM', onExitSignal)
}

module.exports = withSoftExit
