#!/usr/bin/env node
const amqp = require('amqplib/callback_api')

// Create connection
amqp.connect('amqp://localhost', (err, conn) => {
  // Create channel
  conn.createChannel((err, ch) => {
    // Name of the queue
    const q = 'hello'
    // Declare the queue
    ch.assertQueue(q, { durable: false })

    // Send message to the queue
    ch.sendToQueue(q, new Buffer('Hello World!'))
    console.log(" {x} Sent 'Hello World'")

    // Close the connection and exit
    setTimeout(() => {
      conn.close()
      process.exit(0)
    }, 500)
  })
})
