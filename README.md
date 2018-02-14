# RabbitMQ for Node.js
This is a simple guide to create a RabbitMQ consumer/producer in MacOS using Node.js. The steps on this guide may also be applied to other operating systems but be aware that installation and running of RabbitMQ binaries and services could be different. In a nutshell, this guide covers installation, execution and basic configuration of the RabbitMQ service in Node.js.

## 1. Install RabbitMQ
- https://www.rabbitmq.com/install-homebrew.html

- `brew install rabbitmq`

## 2. Mac OS Brew install issues
- As of writing, I expect that you will also have this issue:

### Issue
```
Error: The `brew link` step did not complete successfully
The formula built, but is not symlinked into /usr/local
Could not symlink sbin/cuttlefish
/usr/local/sbin is not writable.
```
### Fix
```
cd /usr/local
sudo mkdir sbin
sudo chown -R glenn:admin sbin
brew link rabbitmq
```

## 3. Start RabbitMQ Service
- `brew services start rabbitmq`

## 4. Create and run `send.js`
```javascript
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
```
```
# Terminal
sudo chmod 755 send.js
./send.js
```

## 5. Create and run `receive.js`
```javascript
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
```

```
# Terminal
sudo chmod 755 receive.js
./receive.js
```

## 6. Listing Queues
```
/usr/local/sbin/rabbitmqctl list_queues
```

# Creating a Round-robin Dispatcher with RabbitMQ

## 1. Create `new_task.js`
```javascript
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
```
## 2. Create `worker.js`
```javascript
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
```
## 3. Open two terminals and run worker.js on each
```
# terminal 1
sudo chmod 755 worker.js
./worker.js
# => [*] Waiting for messages. To exit press CTRL+C
```
```
# terminal 2
./worker.js
# => [*] Waiting for messages. To exit press CTRL+C
```

## 4. Open a third terminal and run several new_task.js
```
sudo chmod 755 new_task.js
./new_task.js First message.
./new_task.js Second message..
./new_task.js Third message...
./new_task.js Fourth message....
./new_task.js Fifth message.....
```

## 5. The tasks will run in sequence for each worker.js currently running.

## 6. Message acknowledgements in `worker.js`. This step was already done so there is nothing else to change anything in worker.js.
```javascript
{ noAck: false } // noAck: false means Message acknowledgments is turned on
// When message acknowledgements are turned on, even if a worker.js is killed (Ctrl+C)
// while processing a message, it will be redelivered
```

## 7. Message durability in both `worker.js` and `new_task.js`. This step was already done so there is nothing else to change anything in worker.js.
```javascript
ch.assertQueue(q, { durable: true }) // { durable: true } ensures that the message will still be redelivered even if RabbitMQ service is turned off/restarted
```
```javascript
// Send acknowledgment
ch.ack(msg)
```

## 8. Checked unacknowledged messages. To test this, comment out `ch.ack(msg)`. Messages will not be acknowledge with this commented.
```
/usr/local/sbin/rabbitmqctl list_queues name messages_ready messages_unacknowledged
```

## 9. Message persistence in `new_task.js`. As requirement to #7, persistence needs to be set to true.
```javascript
ch.sendToQueue(q, new Buffer(msg), {persistent: true}) // {persistent: true} saves the message to disk/cache
```

## 10. Fair dispatch (consumer queue size) in `worker.js`
```javascript
// Tell RabbitMQ not to give more than 1 message per worker
ch.prefetch(1)
```

## 11. In summary:
- The queue is now capable of round robin dispatch of messages.
- Message acknowledgement is turned on which means that if a worker dies, the message will be redelivered if not already acknowledged.
- Message persistence is turned on which means that if the RabbitMQ is killed or restarted, the message will still be written on disk or cache.
- Fair dispatch is enabled which means, the consumer will not process more than X messages per worker at the risk of filling up a queue.