# graphql-amqp-connection-manager-subscriptions

This package implements the PubSubEngine Interface from the [graphql-subscriptions](https://github.com/apollographql/graphql-subscriptions) package.
It allows you to connect your subscriptions manager to a AMQP PubSub mechanism.

This package is influenced by [graphql-amqp-subscriptions](https://github.com/Surnet/graphql-amqp-subscriptions).

[![npm Version](https://img.shields.io/npm/v/graphql-amqp-connection-manager-subscriptions.svg)](https://www.npmjs.com/package/graphql-amqp-connection-manager-subscriptions)
[![npm Downloads](https://img.shields.io/npm/dm/graphql-amqp-connection-manager-subscriptions.svg)](https://www.npmjs.com/package/graphql-amqp-connection-manager-subscriptions)

## Basic usage

```javascript
import { AMQPConnectionManagerPubSub } from 'graphql-amqp-connection-manager-subscriptions';
import { connect } from 'amqp-connection-manager';

connect('amqp://guest:guest@localhost:5672?heartbeat=20')
.then(conn => {
  const pubsub = new AMQPConnectionManagerPubSub({
    connection: conn
    /* exchange: {
       name: 'exchange',
       type: 'topic',
       options: {
         durable: false,
         autoDelete: true
       }
     },
     queue: {
       name: 'queue'
       options: {
         exclusive: true,
         durable: true,
         autoDelete: true
       },
       unbindOnDispose: false;
       deleteOnDispose: false;
     } */
  });

  // Use the pubsub instance from here on
})
.catch(err => {
  console.error(err);
});
```

## Benefits

- Reusing existing [amqp-connection-manager](https://github.com/jwalton/node-amqp-connection-manager) Connection
- Reusing channels (one for subscriptions, one for publishing)

## Debug

This package uses Debug.
To show the logs run your app with the environment variable `DEBUG="AMQPConnectionManagerPubSub"`
