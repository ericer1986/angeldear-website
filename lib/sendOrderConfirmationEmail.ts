
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const EMAIL_TEST_MODE =
  process.env.EMAIL_TEST_MODE !== "false";

const EMAIL_FROM =
  process.env.EMAIL_FROM?.trim() ||
  "Angel Dear Malaysia <onboarding@resend.dev>";

const TEST_EMAIL =
  process.env.EMAIL_TEST_RECIPIENT?.trim() ||
  "delivered@resend.dev";

type Order = {
  id: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  payment_status: string;
  paid_at: string | null;
  confirmation_email_sent_at: string | null;
};

type OrderItem = {
  product_name: string;
  price: number;
  quantity: number;
};

function money(value: number | string) {
  return `RM ${Number(value).toFixed(2)}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString(
    "en-MY",
    {
      timeZone: "Asia/Kuala_Lumpur",
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function createEmailHtml(
  order: Order,
  items: OrderItem[]
) {
  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #eee;">
            <strong>${escapeHtml(item.product_name)}</strong>
            <br />
            <span style="color:#777;font-size:13px;">
              ${money(item.price)} × ${item.quantity}
            </span>
          </td>

          <td
            align="right"
            style="padding:14px 0;border-bottom:1px solid #eee;"
          >
            ${money(Number(item.price) * item.quantity)}
          </td>
        </tr>
      `
    )
    .join("");

  const address = [
    order.address,
    order.city,
    order.postcode,
    order.state,
    "Malaysia",
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br />");

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport"
          content="width=device-width, initial-scale=1" />
        <title>Order Confirmation</title>
      </head>

      <body style="
        margin:0;
        padding:32px 12px;
        background:#FAF8F6;
        font-family:Arial,Helvetica,sans-serif;
        color:#38435A;
      ">
        <div style="
          max-width:600px;
          margin:auto;
          background:white;
          border-radius:18px;
          overflow:hidden;
        ">

          <div style="
            background:#E8C9C1;
            padding:30px;
            text-align:center;
          ">
            <h1 style="margin:0;font-size:28px;">
              Angel Dear Malaysia
            </h1>

            <p style="margin:10px 0 0;">
              Order Confirmation
            </p>
          </div>

          <div style="padding:30px;">
            <h2 style="margin-top:0;">
              Thank you for your order!
            </h2>

            <p>
              Hi ${escapeHtml(order.customer_name)},
            </p>

            <p style="line-height:1.7;">
              We have received your payment.
              Thank you for shopping with
              Angel Dear Malaysia.
            </p>

            <div style="
              background:#F5FAF5;
              padding:18px;
              border-radius:12px;
              margin:24px 0;
            ">
              <strong style="color:#247A42;">
                Payment Successful
              </strong>

              <p style="margin-bottom:0;font-size:13px;">
                Paid at: ${escapeHtml(formatDate(order.paid_at))}
              </p>
            </div>

            <h3>Order Details</h3>

            <p style="font-size:13px;overflow-wrap:anywhere;">
              <strong>Order ID:</strong>
              ${escapeHtml(order.id)}
            </p>

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="border-collapse:collapse;"
            >
              ${itemRows}
            </table>

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="margin-top:24px;"
            >
              <tr>
                <td style="padding:8px 0;">Subtotal</td>
                <td align="right">
                  ${money(order.subtotal)}
                </td>
              </tr>

              <tr>
                <td style="padding:8px 0;">Shipping</td>
                <td align="right">
                  ${
                    Number(order.shipping) === 0
                      ? "FREE"
                      : money(order.shipping)
                  }
                </td>
              </tr>

              <tr>
                <td style="
                  padding-top:16px;
                  border-top:1px solid #ddd;
                  font-size:20px;
                  font-weight:bold;
                ">
                  Total
                </td>

                <td align="right" style="
                  padding-top:16px;
                  border-top:1px solid #ddd;
                  font-size:20px;
                  font-weight:bold;
                ">
                  ${money(order.total)}
                </td>
              </tr>
            </table>

            <h3 style="margin-top:32px;">
              Delivery Information
            </h3>

            <p style="line-height:1.7;">
              ${escapeHtml(order.customer_name)}
              <br />
              ${address}
              <br />
              ${escapeHtml(order.phone || "")}
            </p>

            <p style="
              margin-top:32px;
              font-size:13px;
              line-height:1.7;
              color:#777;
            ">
              This email confirms your payment.
              We will update your order status
              as your order is processed.
            </p>
          </div>

          <div style="
            background:#FAF8F6;
            padding:24px;
            text-align:center;
            color:#777;
            font-size:12px;
          ">
            Angel Dear Malaysia
            <br />
            Thank you for shopping with us.
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendOrderConfirmationEmail(
  orderId: string
) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is missing."
    );
  }

  // 1. Read order from trusted database.

  const { data: order, error: orderError } =
    await supabaseAdmin
      .from("orders")
      .select(`
        id,
        customer_name,
        email,
        phone,
        address,
        city,
        state,
        postcode,
        subtotal,
        shipping,
        total,
        payment_status,
        paid_at,
        confirmation_email_sent_at
      `)
      .eq("id", orderId)
      .single();

  if (orderError || !order) {
    throw new Error(
      "Unable to load order for confirmation email."
    );
  }

  const typedOrder = order as Order;

  // 2. Only send after verified payment.

  if (typedOrder.payment_status !== "paid") {
    return {
      success: false,
      skipped: true,
      reason: "ORDER_NOT_PAID",
    };
  }

  // 3. Skip previously recorded sends.

  if (typedOrder.confirmation_email_sent_at) {
    return {
      success: true,
      skipped: true,
      reason: "EMAIL_ALREADY_SENT",
    };
  }

  // 4. Verify customer email.

  if (!typedOrder.email) {
    return {
      success: false,
      skipped: true,
      reason: "CUSTOMER_EMAIL_MISSING",
    };
  }

  // 5. Read order items.

  const { data: items, error: itemsError } =
    await supabaseAdmin
      .from("order_items")
      .select(`
        product_name,
        price,
        quantity
      `)
      .eq("order_id", orderId);

  if (itemsError || !items || items.length === 0) {
    throw new Error(
      "Unable to load order items for email."
    );
  }

  // 6. Send through Resend.
  // Test mode never sends to real customers.

  const resend = new Resend(apiKey);

  const { data, error } =
    await resend.emails.send(
      {
        from: EMAIL_FROM,

        to: [
          EMAIL_TEST_MODE
  ? TEST_EMAIL
  : typedOrder.email
        ],

        subject:
          `Angel Dear Order Confirmation - ${orderId}`,

        html: createEmailHtml(
          typedOrder,
          items as OrderItem[]
        ),
      },
      {
        idempotencyKey:
          `order-confirmation/${orderId}/v1`,
      }
    );

  if (error) {
    console.error(
      "Order Confirmation Email Error:",
      {
        orderId,
        message: error.message,
      }
    );

    throw new Error(
      "Unable to send order confirmation email."
    );
  }

  if (!data?.id) {
    throw new Error(
      "Resend did not return an email ID."
    );
  }

  // 7. Record successful API acceptance.
  // This does not guarantee inbox delivery.

  const { error: updateError } =
    await supabaseAdmin
      .from("orders")
      .update({
        confirmation_email_sent_at:
          new Date().toISOString(),

        confirmation_email_id:
          data.id,
      })
      .eq("id", orderId)
      .is("confirmation_email_sent_at", null);

  if (updateError) {
    console.error(
      "Email Tracking Update Error:",
      {
        orderId,
        message: updateError.message,
      }
    );

    throw new Error(
      "Email accepted but tracking update failed."
    );
  }

  return {
    success: true,
    skipped: false,
    emailId: data.id,
    testMode: EMAIL_TEST_MODE,
  };
}
