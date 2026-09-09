import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/*
 * Next 16 renamed the "middleware" convention to "proxy". Runs on every
 * matched request: refreshes the Supabase session cookie (so people stay
 * logged in) and redirects signed-out visitors away from protected
 * routes. Public routes are "/" and anything under "/auth".
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
