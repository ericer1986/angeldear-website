import { NextResponse } from "next/server";
import { sendOrderConfirmationEmail } from "@/lib/sendOrderConfirmationEmail";

export async function POST(request: Request) {
  try {
    // Development-only endpoint.
    // Never allow this route to run in production.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          success: false,
          error: "This test endpoint is disabled in production.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const orderId =
      typeof body?.orderId === "string"
        ? body.orderId.trim()
        : "";

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "orderId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await sendOrderConfirmationEmail(orderId);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "Order Email Test Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to test order confirmation email.",
      },
      {
        status: 500,
      }
    );
  }
}