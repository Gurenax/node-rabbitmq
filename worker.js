#!/usr/bin/env node
const amqp = require('amqplib/callback_api')

// Create connection
amqp.connect('amqp://localhost', (err, conn) => {
  // Create channel
  conn.createChannel((err, ch) => {
    // Name of the queue
    const q = 'task_queue'
    // Declare the queue
    ch.assertQueue(q, { durable: false })

    // Wait for Queue Messages
    console.log(` [*] Waiting for messages in ${q}. To exit press CTRL+C`)
    ch.consume( q, msg => {
        const secs = msg.content.toString().split('.').length - 1
        console.log(` [x] Received ${msg.content.toString()}`)
        // Fake task which simulates execution time
        setTimeout(function() {
          console.log(" [x] Done");
        }, secs * 1000)
      }, { noAck: true }
    )
  })
})
