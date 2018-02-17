#!/usr/bin/env node
const amqp = require('amqplib/callback_api')

// Create connection
amqp.connect('amqp://localhost', (err, conn) => {
  // Create channel
  conn.createChannel((err, ch) => {
    // Name of the queue
    const q = 'task_queue_durable'
    // Write a message
    const msg = process.argv.slice(2).join(' ') || "Hello World!"

    // Declare the queue
    ch.assertQueue(q, { durable: true }) // { durable: true } ensures that the message will still be redelivered even if RabbitMQ service is turned off/restarted

    // Send message to the queue
    ch.sendToQueue(q, new Buffer(msg), {persistent: true}) // {persistent: true} saves the message to disk/cache
    console.log(` {x} Sent '${msg}'`)

    // Close the connection and exit
    setTimeout(() => {
      conn.close()
      process.exit(0)
    }, 500)
  })
})
