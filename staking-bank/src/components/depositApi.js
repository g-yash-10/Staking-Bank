async function request(path, options) {
  const response = await fetch(`/api/v1/deposits${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || 'The deposit service request failed.');
  }
  return body;
}

export function getBootstrap() {
  return request('/bootstrap');
}

export function createQuote(currency, amount) {
  return request('/quotes', {
    method: 'POST',
    body: JSON.stringify({ currency, amount }),
  });
}

export function confirmQuote(id) {
  return request(`/quotes/${encodeURIComponent(id)}/confirm`, { method: 'POST' });
}

export function completeQuote(id) {
  return request(`/quotes/${encodeURIComponent(id)}/complete`, { method: 'POST' });
}

export function expireQuote(id) {
  return request(`/quotes/${encodeURIComponent(id)}/expire`, { method: 'POST' });
}
