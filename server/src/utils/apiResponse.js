const sendResponse = (res, statusCode, message, data = null, meta = null) => {
  const responseBody = {
    success: statusCode >= 200 && statusCode < 300,
    message,
    ...(data !== null && { data }),
    ...(meta !== null && { meta }),
  };
  return res.status(statusCode).json(responseBody);
};

module.exports = { sendResponse };
