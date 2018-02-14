#!/usr/bin/env node
const amqp = require('amqplib/callback_api')

// Create connection
amqp.connect('amqp://localhost', (err, conn) => {
  // Create channel
  conn.createChannel((err, ch) => {
    // Name of the queue
    const q = 'task_queue_durable'
    // Declare the queue
    ch.assertQueue(q, { durable: true }) // { durable: true } ensures that the message will still be redelivered even if RabbitMQ service is turned off/restarted
    // Tell RabbitMQ not to give more than 1 message per worker
    ch.prefetch(1)

    // Wait for Queue Messages
    console.log(` [*] Waiting for messages in ${q}. To exit press CTRL+C`)
    ch.consume( q, msg => {
        // Just to simulate a fake task, length of dots in the message
        // is the number of secs the task will run
        const secs = msg.content.toString().split('.').length - 1

        console.log(` [x] Received ${msg.content.toString()}`)
        console.log(` [x] Task will run for ${secs} secs`)
        
        // Fake task which simulates execution time
        setTimeout(() => {
          console.log(` [x] Done ${msg.content.toString()}`);
          // Send acknowledgment
          ch.ack(msg)
        }, secs * 1000)

      }, { noAck: false } // noAck: false means Message acknowledgments is turned on
      // When message acknowledgements are turned on, even if a worker.js is killed (Ctrl+C)
      // while processing a message, it will be redelivered
    )
  })
})
