import { Common } from '../common';

describe('Common', () => {
  describe('convertMessage', () => {
    it('should convert a buffer to a string', () => {
      const message = Common.convertMessage({
        fields: {
          deliveryTag: 1,
          consumerTag: 'tag',
          redelivered: false,
          exchange: 'exchange',
          routingKey: 'test.test',
        },
        properties: {
          contentType: undefined,
          contentEncoding: undefined,
          headers: {},
          deliveryMode: undefined,
          priority: undefined,
          correlationId: undefined,
          replyTo: undefined,
          expiration: undefined,
          messageId: undefined,
          timestamp: undefined,
          type: undefined,
          userId: undefined,
          appId: undefined,
          clusterId: undefined,
        },
        content: Buffer.from('test'),
      });

      expect(message).toEqual('test');
    });

    it('should convert a stringified JSON to JSON', () => {
      const message = Common.convertMessage({
        fields: {
          deliveryTag: 1,
          consumerTag: 'tag',
          redelivered: false,
          exchange: 'exchange',
          routingKey: 'test.test',
        },
        properties: {
          contentType: undefined,
          contentEncoding: undefined,
          headers: {},
          deliveryMode: undefined,
          priority: undefined,
          correlationId: undefined,
          replyTo: undefined,
          expiration: undefined,
          messageId: undefined,
          timestamp: undefined,
          type: undefined,
          userId: undefined,
          appId: undefined,
          clusterId: undefined,
        },
        content: Buffer.from('{"test":"data"}'),
      });

      expect(message?.test).toEqual('data');
    });

    it('should return null if a message is not defined', () => {
      const message = Common.convertMessage(undefined);

      expect(message).toBeNull();
    });
  });
});
