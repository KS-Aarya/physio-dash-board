import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Create Twilio client on the server
const client = twilio(accountSid, authToken);

export async function POST(request) {
  try {
    const body = await request.json();
    const { to, message } = body || {};

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing "to" or "message" in request body' },
        { status: 400 }
      );
    }

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { success: false, error: 'Twilio environment variables are not configured' },
        { status: 500 }
      );
    }

    const sms = await client.messages.create({
      to,
      from: fromNumber,
      body: message,
    });

    return NextResponse.json(
      {
        success: true,
        sid: sms.sid,
        status: sms.status,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send SMS',
      },
      { status: 500 }
    );
  }
}



