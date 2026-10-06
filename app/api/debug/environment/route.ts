import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest
) {
  const requestUrl = new URL(request.url);

  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL
      ?.trim()
      .replace(/\/+$/, "") || null;

  const vercelEnvironment =
    process.env.VERCEL_ENV || null;

  const vercelUrl =
    process.env.VERCEL_URL || null;

  const requestOrigin =
    requestUrl.origin;

  let selectedOrigin: string;

  if (vercelEnvironment === "production") {
    selectedOrigin =
      configuredSiteUrl ||
      "MISSING_PRODUCTION_SITE_URL";
  } else if (
    vercelEnvironment === "preview" &&
    vercelUrl
  ) {
    selectedOrigin =
      `https://${vercelUrl}`;
  } else {
    selectedOrigin = requestOrigin;
  }

  return NextResponse.json({
    vercelEnvironment,
    vercelUrl,
    configuredSiteUrl,
    requestOrigin,
    selectedOrigin,
  });
}