import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { Logger } from '@graphql-hive/logger';
import { PinoLogWriter } from '@graphql-hive/logger/writers/pino';
import { createSchema, createYoga } from 'graphql-yoga';

export interface AppOptions {
  logger: boolean;
}

export function buildApp({ logger }: AppOptions): FastifyInstance {
  // Temporary (T06): log the proxy chain once on Light Cloud, to count the hops for trustProxy.
  const app = Fastify({
    logger: logger && {
      serializers: {
        req: (req: FastifyRequest) => ({
          method: req.method,
          url: req.url,
          xff: req.headers['x-forwarded-for'],
        }),
      },
    },
  });

  app.get('/health', async () => ({ status: 'ok' }));

  const yoga = createYoga<{ req: FastifyRequest; reply: FastifyReply }>({
    // Placeholder until the real schema lands in T16.
    schema: createSchema({ typeDefs: 'type Query { _placeholder: Boolean }' }),
    // Route Yoga's own logs (including masked errors) through Fastify's JSON logger.
    logging: new Logger({ writers: [new PinoLogWriter(app.log)] }),
  });

  app.route({
    url: yoga.graphqlEndpoint,
    method: ['GET', 'POST', 'OPTIONS'],
    handler: async (req, reply) => {
      const response = await yoga.handleNodeRequestAndResponse(req, reply, { req, reply });
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.status(response.status);
      reply.send(response.body);
      return reply;
    },
  });

  return app;
}
