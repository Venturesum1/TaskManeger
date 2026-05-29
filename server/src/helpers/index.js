function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function created(res, data) {
  return success(res, data, 201);
}

function fail(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, message });
}

function notFound(res, entity = 'Resource') {
  return fail(res, `${entity} not found`, 404);
}

function unauthorized(res) {
  return fail(res, 'Unauthorized', 401);
}

function forbidden(res) {
  return fail(res, 'Forbidden', 403);
}

function serverError(res, err) {
  return fail(res, err?.message || 'Internal server error', 500);
}

function buildWhatsAppLink(phone, message) {
  const cleaned = phone.replace(/\D/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

function formatDateIN(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  success, created, fail, notFound, unauthorized, forbidden, serverError,
  buildWhatsAppLink, formatDateIN, sleep,
};
