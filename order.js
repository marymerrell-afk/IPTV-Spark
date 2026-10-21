const form = document.querySelector('#order-form');
const status = document.querySelector('#form-status');
const button = document.querySelector('#submit-button');
const planField = document.querySelector('#plan');
const planFromUrl = new URLSearchParams(location.search).get('plan');
if (planFromUrl) planField.value = planFromUrl.slice(0, 80);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  button.disabled = true;
  button.textContent = 'Sending your request…';
  status.textContent = '';
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'We could not send your request.');
    location.assign('/thank-you.html');
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
    button.innerHTML = 'Send order request <span>→</span>';
  }
});
