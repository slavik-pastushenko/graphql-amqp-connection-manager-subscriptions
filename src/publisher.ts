import { AmqpConnectionManager, Channel, ChannelWrapper, Options } from 'amqp-connection-manager';
import { IDebugger } from 'debug';

import { Exchange, PubSubAMQPConnectionManagerConfig } from './common';

export class Publisher {
  private readonly connection: AmqpConnectionManager;
  private readonly exchange: Exchange;
  private channel: ChannelWrapper | null = null;

  constructor(
    public readonly config: PubSubAMQPConnectionManagerConfig,
    private readonly logger: IDebugger,
  ) {
    this.connection = config.connection;
    this.exchange = { name: 'graphql_subscriptions', type: 'topic', options: { durable: false, autoDelete: false }, ...config.exchange };
  }

  public async publish(routingKey: string, data: unknown, options?: Options.Publish): Promise<void> {
    const channel = await this.createChannel(this.exchange);

    this.logger('[Publisher] Publishing a message to exchange "%s" with routing key "%s" (%j)', this.exchange.name, routingKey, data);

    await channel.publish(this.exchange.name, routingKey, Buffer.from(JSON.stringify(data)), options);

    this.logger('[Publisher] Message sent to exchange "%s" with routing key "%s" (%j)', this.exchange.name, routingKey, data);
  }

  public async createChannel(exchange: Exchange): Promise<ChannelWrapper> {
    if (this.channel) {
      return this.channel;
    }

    this.logger('[Publisher] Creating a new channel for exchange "%s"', exchange.name);

    this.channel = await this.connection.createChannel({
      setup: async (ch: Channel) => {
        await ch.assertExchange(exchange.name, exchange.type, exchange.options);
      },
    });

    this.channel.on('error', err => this.logger('[Publisher] Publisher channel error: "%j"', err));

    return this.channel;
  }
}
