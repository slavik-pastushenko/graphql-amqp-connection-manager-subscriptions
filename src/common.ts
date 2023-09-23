import { AmqpConnectionManager, Options } from 'amqp-connection-manager';
import { ConsumeMessage } from 'amqplib';

export class Common {
  public static convertMessage(message?: ConsumeMessage): any {
    if (!message) {
      return null;
    }

    try {
      return JSON.parse(message.content.toString());
    } catch {
      return message.content?.toString();
    }
  }
}

/**
 * @description Message routing agent, defined by the virtual host within RabbitMQ
 */
export interface Exchange {
  /**
   * @description Exchange name
   */
  name: string;

  /**
   * @description Exchange type
   */
  type: string;

  /**
   * @description Exchange options
   */
  options?: Options.AssertExchange;
}

/**
 * @description Ordered collection of messages
 */
export interface Queue {
  /**
   * @description Queue name
   */
  name?: string;

  /**
   * @description Queue options
   */
  options?: Options.AssertQueue;

  /**
   * @description Indicates whether to unbind on dispose or not
   */
  unbindOnDispose?: boolean;

  /**
   * @description Indicates whether to delete on dispose or not
   */
  deleteOnDispose?: boolean;
}

/**
 * @description AMQP connection manager configuration
 */
export interface PubSubAMQPConnectionManagerConfig {
  /**
   * @description Current connection
   */
  connection: AmqpConnectionManager;

  /**
   * @description Exchange configuration details
   */
  exchange?: Exchange;

  /**
   * @description Queue configuration details
   */
  queue?: Queue;
}
