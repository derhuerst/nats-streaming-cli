'use strict'

const natsStreaming = require('node-nats-streaming')

const env = process.env
const url = env.NATS_URI || 'http://localhost:4222'
const clusterId = env.NATS_CLUSTER_ID || 'test-cluster'
const clientId = env.NATS_CLIENT_ID || Math.random().toString(16).slice(2)

const createNatsStreamingClient = () => natsStreaming.connect(clusterId, clientId, {url})

module.exports = createNatsStreamingClient
