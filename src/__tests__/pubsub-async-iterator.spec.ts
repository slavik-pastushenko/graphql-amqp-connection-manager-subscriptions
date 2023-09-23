import { PubSubEngine } from 'graphql-subscriptions';
import { PubSubAsyncIterator } from '../pubsub-async-iterator';

jest.mock('graphql-subscriptions');

describe('PubSubAsyncIterator', () => {
  let pubsub: PubSubEngine;
  let iterator: PubSubAsyncIterator<any>;

  beforeEach(() => {
    pubsub = new (jest.fn() as any)();
    pubsub.subscribe = jest.fn().mockResolvedValue(1);
    pubsub.unsubscribe = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an async iterator', () => {
    iterator = new PubSubAsyncIterator(pubsub, 'event1');

    expect(iterator).toBeDefined();
  });

  it('should subscribe to events on construction', async () => {
    iterator = new PubSubAsyncIterator(pubsub, 'event1');

    await iterator['allSubscribed'];

    expect(pubsub.subscribe).toHaveBeenCalledWith('event1', expect.any(Function), {});
  });

  it('should push values to the iterator', async () => {
    iterator = new PubSubAsyncIterator(pubsub, 'event1');
    await iterator['allSubscribed'];

    const onNext = jest.fn();
    iterator.next().then(onNext);

    const eventData = { key: 'value' };
    await iterator['pushValue'](eventData);

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(onNext).toHaveBeenCalledWith({ value: eventData, done: false });
  });

  it('should pull values from the iterator', async () => {
    iterator = new PubSubAsyncIterator(pubsub, 'event1');
    await iterator['allSubscribed'];

    const eventData = { key: 'value' };
    iterator['pushQueue'].push(eventData);

    const result = await iterator['pullValue']();

    expect(result).toEqual({ value: eventData, done: false });
  });

  it('should unsubscribe and empty queues on return', async () => {
    iterator = new PubSubAsyncIterator(pubsub, 'event1');
    await iterator['allSubscribed'];

    iterator['pushQueue'].push({ key: 'value' });
    iterator['pullQueue'].push(jest.fn());

    const result = await iterator.return();

    expect(pubsub.unsubscribe).toHaveBeenCalled();
    expect(result).toEqual({ value: undefined, done: true });
    expect(iterator['listening']).toBeFalsy();
    expect(iterator['pushQueue']).toHaveLength(0);
    expect(iterator['pullQueue']).toHaveLength(0);
  });

  it('should handle thrown errors', async () => {
    iterator = new PubSubAsyncIterator(pubsub, 'event1');
    await iterator['allSubscribed'];

    const error = new Error('Test Error');
    const onError = jest.fn();

    iterator.throw(error).catch(onError);

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should support async iteration', async () => {
    iterator = new PubSubAsyncIterator(pubsub, 'event1');
    await iterator['allSubscribed'];

    const eventData = { key: 'value' };
    iterator['pushQueue'].push(eventData);

    const result = await iterator.next();

    expect(result).toEqual({ value: eventData, done: false });
  });
});
