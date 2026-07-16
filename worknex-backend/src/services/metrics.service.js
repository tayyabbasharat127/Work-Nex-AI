const logger = require('../config/logger');
const { config } = require('../config/env');

const recordHttpRequest = ({ method, statusCode, durationMs }) => {
  if (!config.metricsEnabled) return;

  logger.info('HTTP request metric', {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [{
        Namespace: 'WorkNex/Backend',
        Dimensions: [['Service', 'Environment', 'Method']],
        Metrics: [
          { Name: 'RequestCount', Unit: 'Count' },
          { Name: 'ErrorCount', Unit: 'Count' },
          { Name: 'Duration', Unit: 'Milliseconds' },
        ],
      }],
    },
    Service: 'worknex-backend',
    Environment: config.env,
    Method: method,
    RequestCount: 1,
    ErrorCount: statusCode >= 500 ? 1 : 0,
    Duration: durationMs,
  });
};

module.exports = { recordHttpRequest };
