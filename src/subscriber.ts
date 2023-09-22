import { AmqpConnectionManager, Options, Channel, ChannelWrapper } from 'amqp-connection-manager';
import { ConsumeMessage } from 'amqplib';
import { IDebugger } from 'debug';

import { Common, Exchange, Queue, PubSubAMQPConnectionManagerConfig } from './common';

export class Subscriber {
  private readonly connection: AmqpConnectionManager;
  private readonly exchange: Exchange;
  private readonly queue: Queue;

  constructor(
    public readonly config: PubSubAMQPConnectionManagerConfig,
    private readonly logger: IDebugger,
  ) {
    this.connection = config.connection;
    this.queue = { options: { exclusive: true, durable: false, autoDelete: true }, ...config.queue };
    this.exchange = { name: 'graphql_subscriptions', type: 'topic', options: { durable: false, autoDelete: false }, ...config.exchange };
  }

  public async subscribe(
    routingKey: string,
    action: (routingKey: string, content: unknown, message: ConsumeMessage) => void,
    args?: unknown,
    options?: Options.Consume,
  ): Promise<() => Promise<void>> {
    // Create and bind queue
    const queueName = this.queue?.name || '';
    const channel = await this.createChannel(this.exchange, this.queue, routingKey, args);

    // Listen for messages
    const opts = await channel.consume(
      queueName,
      msg => {
        let content = Common.convertMessage(msg);

        this.logger('Message arrived from queue "%s" (%j)', queueName, content);

        action(routingKey, content, msg);
      },
      { noAck: true, ...options },
    );

    this.logger('Subscribed to queue "%s" (%s)', queueName, opts.consumerTag);

    // Dispose callback
    return async (): Promise<void> => {
      this.logger('Disposing subscriber to queue "%s" (%s)', queueName, opts.consumerTag);

      const channel = await this.createChannel(this.exchange, this.queue, routingKey, args);
      await channel.cancel(opts.consumerTag);

      if (this.queue.unbindOnDispose) {
        await channel.unbindQueue(queueName, this.exchange.name, routingKey);
      }

      if (this.queue.deleteOnDispose) {
        await channel.deleteQueue(queueName);
      }
    };
  }

  private async createChannel(exchange: Exchange, queue: Queue, routingKey: string, args: unknown): Promise<ChannelWrapper> {
    const channel = await this.connection.createChannel({
      setup: async (channel: Channel) => {
        await channel.assertExchange(exchange.name, exchange.type, exchange.options);

        const assertedQueue = await channel.assertQueue(queue?.name || '', queue?.options);

        await channel.bindQueue(assertedQueue.queue, exchange.name, routingKey, args);
      },
    });

    channel.on('error', err => this.logger('Subscriber channel error: "%j"', err));

    return channel;
  }
}
