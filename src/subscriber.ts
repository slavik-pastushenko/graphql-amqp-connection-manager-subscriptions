import { AmqpConnectionManager, Options, Channel, ChannelWrapper } from 'amqp-connection-manager';
import { ConsumeMessage } from 'amqplib';
import { IDebugger } from 'debug';

import { Common, Exchange, Queue, PubSubAMQPConnectionManagerConfig } from './common';

export class Subscriber {
  private readonly connection: AmqpConnectionManager;
  private readonly exchange: Exchange;
  private readonly queue: Queue;
  private channel: ChannelWrapper | null = null;

  constructor(
    public readonly config: PubSubAMQPConnectionManagerConfig,
    private readonly logger: IDebugger,
  ) {
    this.connection = config.connection;
    this.queue = { name: config?.queue?.name || '', options: { exclusive: true, durable: false, autoDelete: true }, ...config.queue };
    this.exchange = { name: 'graphql_subscriptions', type: 'topic', options: { durable: false, autoDelete: false }, ...config.exchange };
  }

  public async subscribe(
    routingKey: string,
    action: (routingKey: string, content: unknown, message: ConsumeMessage) => void,
    args?: unknown,
    options?: Options.Consume,
  ): Promise<() => Promise<void>> {
    // Create and bind queue
    const channel = await this.createChannel(this.exchange, this.queue, routingKey, args);

    if (!channel.queueLength()) {
      await this.createQueue(channel, this.queue.name, routingKey, args);
    }

    // Listen for messages
    const opts = await channel.consume(
      this.queue.name,
      msg => {
        let content = Common.convertMessage(msg);

        this.logger('[Subscriber] Message arrived from queue "%s" (%j)', this.queue.name, content);

        action(routingKey, content, msg);
      },
      { noAck: true, ...options },
    );

    this.logger('[Subscriber] Subscribed to queue "%s" (%s)', this.queue.name, opts.consumerTag);

    // Dispose callback
    return async (): Promise<void> => {
      this.logger('[Subscriber] Disposing subscriber to queue "%s" (%s)', this.queue.name, opts.consumerTag);

      const channel = await this.createChannel(this.exchange, this.queue, routingKey, args);

      await channel.cancel(opts.consumerTag);

      await channel.unbindQueue(this.queue.name, this.exchange.name, routingKey);
      this.logger('[Subscriber] Unbound queue "%s" (%s)', this.queue.name, routingKey);

      await channel.deleteQueue(this.queue.name);
      this.logger('[Subscriber] Deleted queue "%s" (%s)', this.queue.name, routingKey);
    };
  }

  public async createChannel(exchange: Exchange, queue: Queue, routingKey: string, args: unknown): Promise<ChannelWrapper> {
    if (this.channel) {
      return this.channel;
    }

    this.channel = await this.connection.createChannel({
      setup: async (ch: Channel) => {
        this.logger('[Subscriber] Creating a new channel for exchange "%s"', exchange.name);

        await ch.assertExchange(exchange.name, exchange.type, exchange.options);

        const assertedQueue = await ch.assertQueue(queue.name, queue?.options);

        await ch.bindQueue(assertedQueue.queue, exchange.name, routingKey, args);
      },
    });

    this.channel.on('error', err => this.logger('[Subscriber] Channel error: "%j"', err));

    return this.channel;
  }

  public async createQueue(channel: ChannelWrapper, queueName: string, routingKey: string, args: any): Promise<void> {
    const assertedQueue = await channel.assertQueue(queueName, this.queue?.options);
    this.logger('[Subscriber] Asserted a queue "%s" for exchange (%s)', queueName, this.exchange.name);

    await channel.bindQueue(assertedQueue.queue, this.exchange.name, routingKey, args);
    this.logger('[Subscriber] Binded a queue "%s" for exchange (%s)', assertedQueue.queue, this.exchange.name);
  }
}
