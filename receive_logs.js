#!/usr/bin/env node
const amqp = require('amqplib/callback_api')

// Create connection
amqp.connect('amqp://localhost', (err, conn) => {
  // Create channel
  conn.createChannel((err, ch) => {
    // Name of the exchange
    const ex = 'logs'
    // Declare the exchange
    ch.assertExchange(ex, 'fanout', { durable: false }) // 'fanout' will broadcast all messages to all the queues it knows

    // Declare the queues
    ch.assertQueue('', {exclusive: true}, (err, q) => {
      // Wait for Queue Messages
      console.log(` [*] Waiting for messages in ${q}. To exit press CTRL+C`)
      // Tell exchange to send messages to queue
      ch.bindQueue(q.queue, ex, '')
      // Consume queue messages
      ch.consume(q.queue, msg => {
        console.log(` [x] ${msg.content.toString()}`)
      }, {noAck: true})
    })
  })
})
