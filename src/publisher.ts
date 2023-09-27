import { AmqpConnectionManager, Channel, ChannelWrapper, Options } from 'amqp-connection-manager';
import { IDebugger } from 'debug';

import { Exchange, PubSubAMQPConnectionManagerConfig } from './common';

export class Publisher {
  private readonly connection: AmqpConnectionManager;
  private readonly exchange: Exchange;

  constructor(
    public readonly config: PubSubAMQPConnectionManagerConfig,
    private readonly logger: IDebugger,
  ) {
    this.connection = config.connection;
    this.exchange = { name: 'graphql_subscriptions', type: 'topic', options: { durable: false, autoDelete: false }, ...config.exchange };
  }

  public async publish(routingKey: string, data: unknown, options?: Options.Publish): Promise<void> {
    const channel = await this.createChannel(this.exchange);

    this.logger('Publishing message to exchange "%s" with routing key "%s" (%j)', this.exchange.name, routingKey, data);

    await channel.publish(this.exchange.name, routingKey, Buffer.from(JSON.stringify(data)), options);

    this.logger('Message sent to exchange "%s" with routing key "%s" (%j)', this.exchange.name, routingKey, data);

    await channel?.close();

    this.logger('Channel was closed for exchange "%s"', this.exchange.name);
  }

  public async createChannel(exchange: Exchange): Promise<ChannelWrapper> {
    const channel = await this.connection.createChannel({
      setup: async (ch: Channel) => {
        await ch.assertExchange(exchange.name, exchange.type, exchange.options);
      },
    });

    channel.on('error', err => this.logger('Publisher channel error: "%j"', err));

    return channel;
  }
}
