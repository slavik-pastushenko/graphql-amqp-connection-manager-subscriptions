import { PubSubEngine } from 'graphql-subscriptions';
import { Options } from 'amqp-connection-manager';
import { ConsumeMessage } from 'amqplib';
import Debug from 'debug';
import { v4 as uuidv4 } from 'uuid';

import { Publisher } from './publisher';
import { Subscriber } from './subscriber';
import { PubSubAMQPConnectionManagerConfig } from './common';
import { PubSubAsyncIterator } from './pubsub-async-iterator';

const logger = Debug('AMQPConnectionManagerPubSub');

export class AMQPConnectionManagerPubSub implements PubSubEngine {
  private readonly publisher: Publisher;
  private readonly subscriber: Subscriber;

  private subscriptionMap: { [subId: number]: { routingKey: string; listener: Function } };
  private subsRefsMap: { [trigger: string]: Array<number> };
  private unsubscribeMap: { [trigger: string]: () => PromiseLike<unknown> };
  private currentSubscriptionId: number;

  constructor(public readonly config: PubSubAMQPConnectionManagerConfig) {
    this.subscriptionMap = {};
    this.subsRefsMap = {};
    this.unsubscribeMap = {};

    this.currentSubscriptionId = 0;

    // Initialize AMQP Connection Manager helper
    this.publisher = new Publisher(config, logger);
    this.subscriber = new Subscriber(config, logger);

    logger('Finished initializing');
  }

  public async publish(routingKey: string, payload: unknown, options?: Options.Publish): Promise<void> {
    return this.publisher.publish(routingKey, payload, options);
  }

  public async subscribe(
    routingKey: string | 'fanout',
    onMessage: (content: unknown, message?: ConsumeMessage) => void,
    args?: Options.AssertQueue,
    options?: Options.Consume,
  ): Promise<number> {
    const id = this.currentSubscriptionId++;

    if (routingKey === 'fanout') {
      routingKey = uuidv4();
    }

    logger('Subscribing to "%s" with id: "%s"', routingKey, id);

    this.subscriptionMap[id] = { routingKey: routingKey, listener: onMessage };

    const refs = this.subsRefsMap[routingKey];

    if (refs?.length > 0) {
      const newRefs = [...refs, id];
      this.subsRefsMap[routingKey] = newRefs;

      return id;
    }

    this.subsRefsMap[routingKey] = [...(this.subsRefsMap[routingKey] || []), id];

    const existingDispose = this.unsubscribeMap[routingKey];

    // Get rid of existing subscription while we get a new one.
    const [newDispose] = await Promise.all([
      this.subscriber.subscribe(routingKey, this.onMessage, args, options),
      existingDispose ? existingDispose() : Promise.resolve(),
    ]);

    this.unsubscribeMap[routingKey] = newDispose;

    return id;
  }

  public async unsubscribe(subId: number): Promise<void> {
    const sub = this.subscriptionMap[subId];

    if (!sub) {
      throw new Error(`There is no subscription for id "${subId}"`);
    }

    const { routingKey } = sub;
    const refs = this.subsRefsMap[routingKey];

    if (!refs) {
      throw new Error(`There is no subscription ref for routing key "${routingKey}", id "${subId}"`);
    }

    logger('Unsubscribing from "%s" with id: "%s"', routingKey, subId);

    if (refs.length === 1) {
      delete this.subscriptionMap[subId];
      return this.unsubscribeForKey(routingKey);
    }

    const index = refs.indexOf(subId);
    const newRefs = index === -1 ? refs : [...refs.slice(0, index), ...refs.slice(index + 1)];

    this.subsRefsMap[routingKey] = newRefs;

    delete this.subscriptionMap[subId];
  }

  public asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    return new PubSubAsyncIterator<T>(this, triggers);
  }

  private onMessage = (routingKey: string, content: unknown, message: ConsumeMessage | null): void => {
    const subscribers = this.subsRefsMap[routingKey];

    // Don't work for nothing...
    if (!subscribers?.length) {
      this.unsubscribeForKey(routingKey).catch(err => {
        logger('onMessage unsubscribeForKey error "%j", routing key "%s"', err, routingKey);
      });

      return;
    }

    for (const subId of subscribers) {
      this.subscriptionMap[subId].listener(content, message);
    }
  };

  private async unsubscribeForKey(routingKey: string): Promise<void> {
    const dispose = this.unsubscribeMap[routingKey];

    delete this.unsubscribeMap[routingKey];
    delete this.subsRefsMap[routingKey];

    await dispose();
  }
}
