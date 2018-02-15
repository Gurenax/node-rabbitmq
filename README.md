# RabbitMQ for Node.js in less than 25 steps
This is a simple guide to create a RabbitMQ consumer/producer in MacOS using Node.js based on [RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials/tutorial-one-javascript.html). The steps on this guide may also be applied to other operating systems but be aware that installation and running of RabbitMQ binaries and services could be different. In a nutshell, this guide covers installation, execution and basic configuration of the RabbitMQ service in Node.js.

## Contents
### Getting Started
1. [Install RabbitMQ](#1)
2. [Mac OS Brew install issues](#2)
3. [Start RabbitMQ Service](#3)
4. [Create and run `send.js`](#4)
5. [Create and run `receive.js`](#5)
6. [Listing Queues](#6)
### Work Queue Pattern (Round-robin Dispatcher)
1. [Create `new_task.js`](#7)
2. [Create `worker.js`](#8)
3. [Running `worker.js`](#9)
4. [Running `new_task.js`](#10)
5. [Tasks running in sequence](#11)
6. [Message acknowledgements](#12)
7. [Message durability](#13)
8. [Check unacknowledged messages](#14)
9. [Message persisence](#15)
10. [Fair dispatch](#16)
11. [Summary](#17)
### Publish and Subscribe Pattern
1. [Create `emit_log.js`](#18)
2. [Create `receive_logs.js`](#19)
3. [Running`receive_logs.js`](#20)
4. [Running `emit_logs.js`](#21)
5. [Messages published to subscribers](#22)
6. [Check bindings](#23)
7. [Check types of exchanges](#24)

# Getting Started
## <a id="1"></a>1. Install RabbitMQ
- https://www.rabbitmq.com/install-homebrew.html

- `brew install rabbitmq`

## <a id="2"></a>2. Mac OS Brew install issues
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

## <a id="3"></a>3. Start RabbitMQ Service
- `brew services start rabbitmq`

## <a id="4"></a>4. Create and run `send.js`
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

## <a id="5"></a>5. Create and run `receive.js`
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

## <a id="6"></a>6. Listing Queues
```
/usr/local/sbin/rabbitmqctl list_queues
```

# Work Queue Pattern (Round-robin Dispatcher)

## <a id="7"></a>1. Create `new_task.js`
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
## <a id="8"></a>2. Create `worker.js`
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
## <a id="9"></a>3. Open two terminals and run worker.js on each
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

## <a id="10"></a>4. Open a third terminal and run several new_task.js
```
sudo chmod 755 new_task.js
./new_task.js First message.
./new_task.js Second message..
./new_task.js Third message...
./new_task.js Fourth message....
./new_task.js Fifth message.....
```

## <a id="11"></a>5. The tasks will run in sequence for each worker.js currently running.

## <a id="12"></a>6. Message acknowledgements in `worker.js`. This step was already done so there is nothing else to change anything in worker.js.
```javascript
{ noAck: false } // noAck: false means Message acknowledgments is turned on
// When message acknowledgements are turned on, even if a worker.js is killed (Ctrl+C)
// while processing a message, it will be redelivered
```

## <a id="13"></a>7. Message durability in both `worker.js` and `new_task.js`. This step was already done so there is nothing else to change anything in worker.js.
```javascript
ch.assertQueue(q, { durable: true }) // { durable: true } ensures that the message will still be redelivered even if RabbitMQ service is turned off/restarted
```
```javascript
// Send acknowledgment
ch.ack(msg)
```

## <a id="14"></a>8. Check unacknowledged messages. To test this, comment out `ch.ack(msg)`. Messages will not be acknowledge with this commented.
```
/usr/local/sbin/rabbitmqctl list_queues name messages_ready messages_unacknowledged
```

## <a id="15"></a>9. Message persistence in `new_task.js`. As requirement to #7, persistence needs to be set to true.
```javascript
ch.sendToQueue(q, new Buffer(msg), {persistent: true}) // {persistent: true} saves the message to disk/cache
```

## <a id="16"></a>10. Fair dispatch (consumer queue size) in `worker.js`
```javascript
// Tell RabbitMQ not to give more than 1 message per worker
ch.prefetch(1)
```

## <a id="17"></a>11. In summary:
- The queue is now capable of round robin dispatch of messages.
- Message acknowledgement is turned on which means that if a worker dies, the message will be redelivered if not already acknowledged.
- Message persistence is turned on which means that if the RabbitMQ is killed or restarted, the message will still be written on disk or cache.
- Fair dispatch is enabled which means, the consumer will not process more than X messages per worker at the risk of filling up a queue.


# Publish and Subscribe Pattern
## <a id="18"></a>1. Create `emit_log.js`
```javascript
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
```
### Major differences from previous pattern `new_task.js`
1. We are not declaring an exchange instead of a queue
```javascript
// Name of the exchange
const ex = 'logs'
```
```javascript
// Declare the exchange
ch.assertExchange(ex, 'fanout', { durable: false }) // 'fanout' will broadcast all messages to all the queues it knows
```
2. We now publish messages instead of sending a message directly to a queue
```javascript
// Send message to the exchange
ch.publish(ex, '', new Buffer(msg))  // '' empty string means that message will not be sent to a specific queue
```

## <a id="19"></a>2. Create `receive_logs.js`
```javascript
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
```
### Major differences from previous pattern `worker.js`
1. We are not declaring an exchange instead of a queue
```javascript
// Name of the exchange
const ex = 'logs'
```
```javascript
// Declare the exchange
ch.assertExchange(ex, 'fanout', { durable: false }) // 'fanout' will broadcast all messages to all the queues it knows
```
2. We create a non-durable queue with a generated queue name by specifying an empty string.
```javascript
ch.assertQueue('', {exclusive: true}, (err, q) => {
```
3. We bind the exchange to the queue
```javascript
// Tell exchange to send messages to queue
ch.bindQueue(q.queue, ex, '')
```
4. The consumer consumes messages to every queue in the exchange (i.e. Sent to all running queues)
```javascript
// Consume queue messages
ch.consume(q.queue, msg => {
  console.log(` [x] ${msg.content.toString()}`)
}, {noAck: true})
```

## <a id="20"></a>3. Open two terminals and run `receive_logs.js` for each.
```
#Terminal 1
sudo chmod 755 receive_logs.js
./receive_logs.js
```
```
#Terminal 2
./receive_logs.js
```
## <a id="21"></a>4. Open a third terminal and run `emit_logs.js`.
```
#Terminal 3
sudo chmod 755 emit_logs.js
./emit_logs.js
```
## <a id="22"></a>5. The message sent by `emit_logs.js` will be sent to all running `receive_logs.js`.

## <a id="23"></a>6. To check all bindings (i.e. Exchanges bound to queues):
```
/usr/local/sbin/rabbitmqctl list_bindings
```

## <a id="24"></a>7. Aside from `fanout`, there are many other types of exchanges. Check them by typing the following in your terminal:
```
/usr/local/sbin/rabbitmqctl list_exchanges
```