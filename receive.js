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

    // Wait for Queue Messages
    console.log(` [*] Waiting for messages in ${q}. To exit press CTRL+C`)
    ch.consume( q, msg => {
        console.log(` [x] Received ${msg.content.toString()}`)
      }, { noAck: true }
    )
  })
})
