#!/usr/bin/env node
const amqp = require('amqplib/callback_api')

// Store message as args
const args = process.argv.slice(2);

// Choose what type of binding key `receive_logs_direct.js` is going to use
// If no arguments were provided, output instructions
if (args.length == 0) {
  console.log("Usage: receive_logs_direct.js [info] [warning] [error]");
  process.exit(1);
}

// Create connection
amqp.connect('amqp://localhost', (err, conn) => {
  // Create channel
  conn.createChannel((err, ch) => {
    // Name of the exchange
    const ex = 'direct_logs'
    // Declare the exchange
    ch.assertExchange(ex, 'direct', { durable: false }) // 'direct' will broadcast messages to its corresponding binding key (i.e. severity)

    // Declare the queues
    ch.assertQueue('', {exclusive: true}, (err, q) => {
      // Wait for Queue Messages
      console.log(` [*] Waiting for messages in ${q}. To exit press CTRL+C`)
      // For each binding key, tell exchange to send messages to queue
      args.forEach( severity => {
        ch.bindQueue(q.queue, ex, severity)
      })
      
      // Consume queue messages
      ch.consume(q.queue, msg => {
        console.log(` [x] ${msg.fields.routingKey}: ${msg.content.toString()}`)
      }, {noAck: true})
    })
  })
})
