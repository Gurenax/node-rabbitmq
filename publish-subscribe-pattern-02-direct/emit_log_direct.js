#!/usr/bin/env node
const amqp = require('amqplib/callback_api')

// Create connection
amqp.connect('amqp://localhost', (err, conn) => {
  // Create channel
  conn.createChannel((err, ch) => {
    // Name of the exchange
    const ex = 'direct_logs'
    // Store message as args
    const args = process.argv.slice(2)
    // Write a message
    const msg = args.slice(1).join(' ') || "Hello World!"
    // Use severity as the binding key
    const severity = (args.length > 0) ? args[0] : 'info'

    // Declare the exchange
    ch.assertExchange(ex, 'direct', { durable: false }) // 'direct' will broadcast messages to its corresponding binding key (i.e. severity)

    // Send message to the exchange
    ch.publish(ex, severity, new Buffer(msg))  // '' empty string means that message will not be sent to a specific queue
    console.log(` {x} Sent ${severity}: '${msg}'`)

    // Close the connection and exit
    setTimeout(() => {
      conn.close()
      process.exit(0)
    }, 500)
  })
})
