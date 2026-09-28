import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET() {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "RESEND_API_KEY is missing.",
        },
        {
          status: 500,
        }
      );
    }

    const resend = new Resend(apiKey);

    const { data, error } =
      await resend.emails.send({
        from: "Angel Dear Malaysia <onboarding@resend.dev>",
        to: ["delivered@resend.dev"],
        subject: "Angel Dear Email Test",
        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 32px;
              color: #38435A;
            "
          >
            <h1>
              Angel Dear Malaysia
            </h1>

            <h2>
              Email System Test
            </h2>

            <p>
              Resend has been connected successfully
              to the Angel Dear website.
            </p>

            <p>
              This is a development test email.
            </p>

            <hr
              style="
                border: none;
                border-top: 1px solid #eeeeee;
                margin: 24px 0;
              "
            />

            <p
              style="
                font-size: 12px;
                color: #888888;
              "
            >
              Angel Dear Malaysia
            </p>
          </div>
        `,
      });

    if (error) {
      console.error(
        "Resend Test Email Error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully.",
      emailId: data?.id ?? null,
    });
  } catch (error) {
    console.error(
      "Email Test Route Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to send test email.",
      },
      {
        status: 500,
      }
    );
  }
}