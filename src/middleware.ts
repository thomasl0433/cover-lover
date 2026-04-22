import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/band(.*)"]);

export default clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
    matcher: [
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jinja2|txt|xml|map|ttf|eot|woff2?|png|jpg|jpeg|gif|webp|ico|svg)).*)",
        "/(api|trpc)(.*)",
    ],
};
