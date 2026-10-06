import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { supabase } from "@/lib/supabase";
import AddToCartButton from "@/components/cart/AddToCartButton";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

function getProductDescription(product: {
  name?: string | null;
  description?: string | null;
  slug?: string | null;
}) {
  const name = String(product.name || "").trim();
  const description = String(product.description || "").trim();
  const slug = String(product.slug || "").trim();

  /*
    Reject empty descriptions and accidental slug-only descriptions.
  */
  const descriptionIsUsable =
    description.length >= 20 &&
    description.toLowerCase() !== slug.toLowerCase();

  if (descriptionIsUsable) {
    return description;
  }

  return `Discover ${name} from Angel Dear Malaysia, selected for comfort, quality and everyday family life.`;
}

async function getProduct(slug: string) {
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (error || !product) {
    return null;
  }

  return product;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Product Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const productName = String(product.name || "").trim();

  const description = getProductDescription(product);

  const shortDescription =
    description.length > 160
      ? `${description.slice(0, 157).trim()}...`
      : description;

  const canonicalPath =
    `/product/${encodeURIComponent(product.slug)}`;

  const productImage =
    typeof product.image === "string" &&
    product.image.trim()
      ? product.image
      : undefined;

  return {
    title: productName,

    description: shortDescription,

    alternates: {
      canonical: canonicalPath,
    },

    openGraph: {
      type: "website",
      title: `${productName} | Angel Dear Malaysia`,
      description: shortDescription,
      url: canonicalPath,
      siteName: "Angel Dear Malaysia",
      locale: "en_MY",
      images: productImage
        ? [
            {
              url: productImage,
              alt: productName,
            },
          ]
        : undefined,
    },

    twitter: {
      card: "summary_large_image",
      title: `${productName} | Angel Dear Malaysia`,
      description: shortDescription,
      images: productImage
        ? [productImage]
        : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;

  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL
      ?.trim()
      .replace(/\/+$/, "") ||
    "https://angeldear.com.my";

  const productUrl =
    `${siteUrl}/product/${encodeURIComponent(
      product.slug
    )}`;

  const description =
    getProductDescription(product);

  const stock = Number(product.stock);
  const inStock = stock > 0;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",

    name: product.name,

    description,

    image: product.image
      ? [product.image]
      : undefined,

    sku: product.sku || undefined,

    brand: product.brand
      ? {
          "@type": "Brand",
          name: product.brand,
        }
      : undefined,

    url: productUrl,

    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "MYR",
      price: Number(product.price).toFixed(2),

      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",

      itemCondition:
        "https://schema.org/NewCondition",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            productJsonLd
          ).replace(/</g, "\\u003c"),
        }}
      />

      <main>
        <section className="mx-auto max-w-7xl px-5 py-12 md:px-6 md:py-16">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12">

            {/* Product Image */}
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-gray-100 md:aspect-auto md:h-[500px]">
              <Image
                src={product.image}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            {/* Product Information */}
            <div className="flex flex-col justify-center">
              {product.brand && (
                <p className="text-sm uppercase tracking-wider text-gray-500">
                  {product.brand}
                </p>
              )}

              <h1 className="mt-3 text-3xl font-bold leading-tight text-[#38435A] md:text-4xl">
                {product.name}
              </h1>

              <div className="mt-5">
                <span className="text-3xl font-bold text-[#AFC7B4]">
                  RM{" "}
                  {Number(
                    product.price
                  ).toFixed(2)}
                </span>
              </div>

              {/* Description */}
              <p className="mt-6 leading-7 text-gray-600">
                {description}
              </p>

              {/* Stock */}
              <div className="mt-6">
                {inStock ? (
                  <p className="text-sm font-medium text-green-700">
                    In Stock
                  </p>
                ) : (
                  <p className="text-sm font-medium text-red-600">
                    Out of Stock
                  </p>
                )}
              </div>

              {/* Add to Cart */}
              <div className="mt-8">
                {inStock ? (
                  <AddToCartButton
                    product={product}
                  />
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded-full bg-gray-200 px-6 py-3.5 font-semibold text-gray-500 md:w-auto"
                  >
                    Out of Stock
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}