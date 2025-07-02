import { NextRequest, NextResponse } from 'next/server';
import { createDriverAccount } from '@/utils/supabase/admin';
import { sanitizePhone } from '@/utils/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, payRate } = body;

    // Validate required fields
    if (!name || !email || !phone || !payRate) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, phone, payRate' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Sanitize and validate phone
    const sanitizedPhone = sanitizePhone(phone);
    if (!sanitizedPhone || sanitizedPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Validate pay rate
    const numericPayRate = parseFloat(payRate);
    if (isNaN(numericPayRate) || numericPayRate <= 0) {
      return NextResponse.json(
        { error: 'Pay rate must be a positive number' },
        { status: 400 }
      );
    }

    // Create driver account
    const result = await createDriverAccount(
      email.toLowerCase().trim(),
      name.trim(),
      parseInt(sanitizedPhone),
      numericPayRate
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Driver account created successfully. Invitation email sent.',
      data: {
        driver: result.data?.driver,
        emailSent: true
      }
    });

  } catch (error) {
    console.error('Error creating driver account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 