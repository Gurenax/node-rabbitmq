#!/usr/bin/env node
const amqp = require('amqplib/callback_api')

// Create connection
amqp.connect('amqp://localhost', (err, conn) => {
  // Create channel
  conn.createChannel((err, ch) => {
    // Name of the exchange
    const ex = 'logs'
    // Write a message
    const msg = process.argv.slice(2).join(' ') || "Hello World!"

    // Declare the exchange
    ch.assertExchange(ex, 'fanout', { durable: false }) // 'fanout' will broadcast all messages to all the queues it knows

    // Send message to the exchange
    ch.publish(ex, '', new Buffer(msg))  // '' empty string means that message will not be sent to a specific queue
    console.log(` {x} Sent '${msg}'`)

    // Close the connection and exit
    setTimeout(() => {
      conn.close()
      process.exit(0)
    }, 500)
  })
})
