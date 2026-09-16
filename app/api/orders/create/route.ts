import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CheckoutItem = {
  productId: string;
  quantity: number;
};

type CheckoutBody = {
  customerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  items?: CheckoutItem[];
};

export async function POST(request: Request) {
  try {
    // =========================================
    // 1. Verify customer login
    // =========================================

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error: "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization.replace("Bearer ", "");

    const {
      data: userData,
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !userData.user
    ) {
      console.error(
        "Create Order Auth Error:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "Invalid or expired login session",
        },
        {
          status: 401,
        }
      );
    }

    const currentUser =
      userData.user;

    // =========================================
    // 2. Read checkout request
    // =========================================

    const body =
      (await request.json()) as CheckoutBody;

    const customerName =
      body.customerName?.trim();

    const email =
      body.email?.trim();

    const phone =
      body.phone?.trim();

    const address =
      body.address?.trim();

    const city =
      body.city?.trim();

    const postcode =
      body.postcode?.trim();

    const items =
      body.items;

    if (
      !customerName ||
      !email ||
      !phone ||
      !address ||
      !city ||
      !postcode
    ) {
      return NextResponse.json(
        {
          error:
            "Please fill in all required fields.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Your cart is empty.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // 3. Validate cart items
    // =========================================

    for (const item of items) {
      if (
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 100
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid cart item.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const productIds =
      items.map(
        (item) =>
          item.productId
      );

    const uniqueProductIds =
      [...new Set(productIds)];

    if (
      uniqueProductIds.length !==
      productIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "Duplicate products detected in cart.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // 4. Read REAL product data
    // =========================================

    const {
      data: products,
      error: productsError,
    } =
      await supabaseAdmin
        .from("products")
        .select(`
          id,
          name,
          price,
          stock,
          active
        `)
        .in(
          "id",
          uniqueProductIds
        );

    if (productsError) {
      console.error(
        "Product Lookup Error:",
        productsError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify products.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !products ||
      products.length !==
        uniqueProductIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "One or more products could not be found.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // 5. Server calculates REAL prices
    // =========================================

    let subtotal = 0;

    const orderItems = [];

    for (
      const cartItem of items
    ) {
      const product =
        products.find(
          (item) =>
            item.id ===
            cartItem.productId
        );

      if (!product) {
        return NextResponse.json(
          {
            error:
              "Product verification failed.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        product.active === false
      ) {
        return NextResponse.json(
          {
            error:
              `${product.name} is currently unavailable.`,
          },
          {
            status: 400,
          }
        );
      }

      const productPrice =
        Number(product.price);

      if (
        !Number.isFinite(
          productPrice
        ) ||
        productPrice < 0
      ) {
        console.error(
          "Invalid Product Price:",
          product.id
        );

        return NextResponse.json(
          {
            error:
              "Invalid product price.",
          },
          {
            status: 500,
          }
        );
      }

      const stock =
        Number(product.stock);

      if (
        !Number.isFinite(stock) ||
        stock < 0
      ) {
        console.error(
          "Invalid Product Stock:",
          product.id
        );

        return NextResponse.json(
          {
            error:
              "Unable to verify product stock.",
          },
          {
            status: 500,
          }
        );
      }

      /*
        This is an early customer-friendly check.

        The FINAL concurrency-safe stock check
        happens inside reserve_order_stock().
      */
      if (
        cartItem.quantity >
        stock
      ) {
        return NextResponse.json(
          {
            error:
              `Not enough stock for ${product.name}.`,
          },
          {
            status: 409,
          }
        );
      }

      subtotal +=
        productPrice *
        cartItem.quantity;

      orderItems.push({
        product_id:
          product.id,
        product_name:
          product.name,
        price:
          productPrice,
        quantity:
          cartItem.quantity,
      });
    }

    subtotal =
      Math.round(
        subtotal * 100
      ) / 100;

    // =========================================
    // 6. Server calculates shipping
    // =========================================

    const shipping =
      subtotal >= 150
        ? 0
        : 10;

    const total =
      Math.round(
        (
          subtotal +
          shipping
        ) * 100
      ) / 100;

    if (total <= 0) {
      return NextResponse.json(
        {
          error:
            "Invalid order total.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // 7. Create order
    // =========================================

    const orderId =
      crypto.randomUUID();

    const {
      error: orderError,
    } =
      await supabaseAdmin
        .from("orders")
        .insert({
          id: orderId,
          user_id:
            currentUser.id,
          customer_name:
            customerName,
          email,
          phone,
          address,
          city,
          postcode,
          subtotal,
          shipping,
          total,
          payment_status:
            "pending",
          order_status:
            "pending",
        });

    if (orderError) {
      console.error(
        "Server Order Insert Error:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Unable to create order.",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================
    // 8. Create order items
    // =========================================

    const finalOrderItems =
      orderItems.map(
        (item) => ({
          order_id:
            orderId,
          ...item,
        })
      );

    const {
      error:
        orderItemsError,
    } =
      await supabaseAdmin
        .from("order_items")
        .insert(
          finalOrderItems
        );

    if (
      orderItemsError
    ) {
      console.error(
        "Server Order Items Insert Error:",
        orderItemsError
      );

      const {
        error: cleanupError,
      } =
        await supabaseAdmin
          .from("orders")
          .delete()
          .eq(
            "id",
            orderId
          );

      if (cleanupError) {
        console.error(
          "Incomplete Order Cleanup Error:",
          cleanupError
        );
      }

      return NextResponse.json(
        {
          error:
            "Unable to create order items.",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================
    // 9. Atomically reserve stock for 15 minutes
    // =========================================

    const {
      data:
        reservationResult,
      error:
        reservationError,
    } =
      await supabaseAdmin.rpc(
        "reserve_order_stock",
        {
          p_order_id:
            orderId,
          p_reservation_minutes:
            15,
        }
      );

    if (
      reservationError
    ) {
      console.error(
        "Stock Reservation Error:",
        {
          orderId,
          code:
            reservationError.code,
          message:
            reservationError.message,
        }
      );

      /*
        Reservation failed.

        No stock was deducted because the
        PostgreSQL function is transactional.

        Remove the invalid order.
        order_items should be removed by
        ON DELETE CASCADE.
      */

      const {
        error: cleanupError,
      } =
        await supabaseAdmin
          .from("orders")
          .delete()
          .eq(
            "id",
            orderId
          );

      if (cleanupError) {
        console.error(
          "Reservation Failure Cleanup Error:",
          {
            orderId,
            message:
              cleanupError.message,
          }
        );
      }

      const reservationMessage =
        reservationError.message ||
        "";

      if (
        reservationMessage.includes(
          "INSUFFICIENT_STOCK"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "One or more products are no longer available in the requested quantity. Please review your cart.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "Unable to reserve stock for this order. Please try again.",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================
    // 10. Validate reservation response
    // =========================================

    if (
      !reservationResult ||
      reservationResult.success !==
        true
    ) {
      console.error(
        "Invalid Reservation Result:",
        {
          orderId,
          reservationResult,
        }
      );

      /*
        This should not normally happen.
        Do NOT automatically delete the order
        here because we cannot safely assume
        whether stock was reserved.
      */

      return NextResponse.json(
        {
          error:
            "Unable to confirm stock reservation.",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================
    // 11. Return SERVER calculated values
    // =========================================

    return NextResponse.json({
      success: true,
      orderId,
      subtotal,
      shipping,
      total,

      reservation: {
        reserved: true,
        expiresAt:
          reservationResult.expires_at,
      },
    });
  } catch (error) {
    console.error(
      "Create Order Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating the order.",
      },
      {
        status: 500,
      }
    );
  }
}