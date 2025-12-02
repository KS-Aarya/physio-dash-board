/**
 * Helper to call the backend Twilio SMS endpoint.
 *
 * Example:
 *   await sendSms('+91XXXXXXXXXX', 'Your appointment is confirmed!');
 */
export async function sendSms(to, message) {
  const res = await fetch('/api/send-sms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, message }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to send SMS');
  }

  return data;
}



