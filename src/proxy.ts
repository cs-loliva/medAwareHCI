import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, isPublicRoute } from "@/lib/auth/routes";
import {
  getPreferredLandingRoute,
  isRole,
  type Role,
} from "@/lib/auth/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function hasSupabaseEnv() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}



async function getProfileCompleted(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("profile_completed")
    .eq("id", userId)
    .maybeSingle();

  return Boolean(data?.profile_completed);
}

async function getUserRoles(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<Role[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  return data
    .flatMap((row) => {
      const relatedRole = row.roles;

      if (Array.isArray(relatedRole)) {
        return relatedRole.map((role) => role?.name);
      }

      return relatedRole?.name;
    })
    .filter((role): role is Role => Boolean(role && isRole(role)));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allows the app to run before Supabase credentials are configured.
  if (!hasSupabaseEnv()) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublicRoute(pathname)) {
    if (user && pathname === "/login") {
      const roles = await getUserRoles(supabase, user.id);
      return redirectTo(request, getPreferredLandingRoute(roles));
    }

    return response;
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const profileCompleted = await getProfileCompleted(supabase, user.id);

  if (
    !profileCompleted &&
    pathname !== "/profile/setup" &&
    pathname !== "/auth/callback"
  ) {
    return redirectTo(request, "/profile/setup");
  }

  const roles = await getUserRoles(supabase, user.id);

  if (pathname === "/role-select" && roles.length === 1) {
    return redirectTo(request, getPreferredLandingRoute(roles));
  }

  if (!canAccessPath(pathname, roles)) {
    return redirectTo(request, "/unauthorized");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};