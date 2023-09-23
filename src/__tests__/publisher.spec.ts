import { Publisher } from '../publisher';
import { AmqpConnectionManagerClass, ChannelWrapper } from 'amqp-connection-manager';
import { IDebugger } from 'debug';

jest.mock('amqp-connection-manager');
jest.mock('debug');

describe('Publisher', () => {
  let publisher: Publisher;
  let mockConnection: AmqpConnectionManagerClass;
  let mockChannel: ChannelWrapper;
  let mockLogger: jest.Mocked<IDebugger>;

  beforeEach(() => {
    mockConnection = new AmqpConnectionManagerClass([]);
    mockChannel = {
      publish: jest.fn(),
      assertExchange: jest.fn(),
      setup: jest.fn(),
      on: jest.fn(),
    } as unknown as ChannelWrapper;
    mockConnection.createChannel = jest.fn().mockResolvedValue(mockChannel);
    mockLogger = jest.fn() as unknown as jest.Mocked<IDebugger>;

    publisher = new Publisher({ connection: mockConnection, exchange: { name: 'test_exchange', type: 'topic', options: {} } }, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publish', () => {
    it('should publish a message', async () => {
      const routingKey = 'test.routing.key';
      const data = { message: 'Test Message' };

      await publisher.publish(routingKey, data);

      expect(mockConnection.createChannel).toHaveBeenCalledTimes(1);
      expect(mockChannel.publish).toHaveBeenCalledWith('test_exchange', routingKey, Buffer.from(JSON.stringify(data)), undefined);
      expect(mockLogger).toHaveBeenCalledTimes(2);
    });
  });

  describe('createChannel', () => {
    it('should create a channel', async () => {
      const exchange = { name: 'Test', type: 'topic' };

      await publisher.createChannel(exchange);

      expect(mockConnection.createChannel).toHaveBeenCalledTimes(1);
      expect(mockConnection.createChannel).toHaveBeenCalledWith({ setup: expect.any(Function) });
    });
  });
});
