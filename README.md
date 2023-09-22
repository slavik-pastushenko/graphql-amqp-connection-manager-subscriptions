# graphql-amqp-connection-manager-subscriptions

Implements the PubSubEngine Interface from the [graphql-subscriptions](https://github.com/apollographql/graphql-subscriptions) package.
It allows you to connect your subscriptions manager to the PubSub mechanism and reuse the existing [amqp-connection-manager](https://github.com/jwalton/node-amqp-connection-manager) connection.

This package is influenced by [graphql-amqp-subscriptions](https://github.com/Surnet/graphql-amqp-subscriptions).

[![npm Version](https://img.shields.io/npm/v/graphql-amqp-connection-manager-subscriptions.svg)](https://www.npmjs.com/package/graphql-amqp-connection-manager-subscriptions)
[![npm Downloads](https://img.shields.io/npm/dm/graphql-amqp-connection-manager-subscriptions.svg)](https://www.npmjs.com/package/graphql-amqp-connection-manager-subscriptions)

## Basic usage

```javascript
import { AMQPConnectionManagerPubSub } from 'graphql-amqp-connection-manager-subscriptions';
import { connect } from 'amqp-connection-manager';

const connection = connect('amqp://guest:guest@localhost:5672?heartbeat=20');
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
```

## Debug

This package uses Debug.
To show the logs run your app with the environment variable `DEBUG="AMQPConnectionManagerPubSub"`
