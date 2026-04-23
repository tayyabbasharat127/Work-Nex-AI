const apiResponse = (res, statusCode, message, data = null, meta = null) => {
  const payload = { success: statusCode < 400, message };
  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

module.exports = { apiResponse };
