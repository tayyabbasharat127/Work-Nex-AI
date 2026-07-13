const { AsyncLocalStorage } = require('async_hooks');
const { randomUUID } = require('crypto');

const requestContext = new AsyncLocalStorage();
const SAFE_CORRELATION_ID = /^[A-Za-z0-9._:-]{1,128}$/;

const requestContextMiddleware = (req, res, next) => {
  const requestId = randomUUID();
  const suppliedCorrelationId = req.get('x-correlation-id');
  const correlationId = SAFE_CORRELATION_ID.test(suppliedCorrelationId || '')
    ? suppliedCorrelationId
    : requestId;
  const auditId = randomUUID();
  const context = { requestId, correlationId, auditId };

  req.requestId = requestId;
  req.correlationId = correlationId;
  req.auditId = auditId;
  res.setHeader('x-request-id', requestId);
  res.setHeader('x-correlation-id', correlationId);

  requestContext.run(context, next);
};

const getRequestContext = () => requestContext.getStore() || {};

module.exports = { requestContextMiddleware, getRequestContext };
