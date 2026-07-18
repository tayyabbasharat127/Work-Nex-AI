const { createLogger, format, transports } = require('winston');
const { combine, timestamp, json, errors } = format;
const { config } = require('./env');
const { getRequestContext } = require('../middleware/requestContext.middleware');

const addRequestContext = format((info) => Object.assign(info, getRequestContext()));

const configuredTransports = [new transports.Console()];
if (config.logToFile) {
  configuredTransports.push(new transports.File({ filename: 'logs/error.log', level: 'error' }));
  configuredTransports.push(new transports.File({ filename: 'logs/combined.log' }));
}

const logger = createLogger({
  level: config.logLevel,
  defaultMeta: { service: 'worknex-backend', environment: config.env },
  format: combine(
    errors({ stack: true }),
    addRequestContext(),
    timestamp(),
    json(),
  ),
  transports: configuredTransports,
});

module.exports = logger;
