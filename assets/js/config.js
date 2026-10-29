/* Linkey — runtime configuration

   Everything here is public by design: the Supabase anon key is a
   publishable key, and row access is enforced by RLS (see BACKEND.md).
   Never put a service-role key or any other secret in this file.

   Leave every value empty to run the app in local demo mode.

   Two independent switches:

   • googleClientId — real "Continue with Google" with no server and no
     secret. Create an OAuth client of type "Web application" in Google
     Cloud Console, add your origin (http://localhost:5200 and your
     production origin) under "Authorised JavaScript origins", and paste
     the `….apps.googleusercontent.com` id here. See BACKEND.md §2a.

   • supabaseUrl + supabaseAnonKey — cloud storage and the Supabase
     Google/email flows. See BACKEND.md §2b.
*/
window.LINKEY_CONFIG = {
  // e.g. "1234567890-abc123.apps.googleusercontent.com"
  googleClientId: "",
  // "auto" (default): pretty /u/<handle> links, except on *.github.io
  // where they fall back to #/u/<handle>. Set "hash" for any static host
  // without rewrites, "path" when you have them (Cloudflare/Vercel/Netlify).
  linkBase: "auto",
  // e.g. "https://abcdefghijklmno.supabase.co"
  supabaseUrl: "https://dmlmgjdmysekesbtuerw.supabase.co",
  // e.g. "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbG1namRteXNla2VzYnR1ZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMzk1MDQsImV4cCI6MjEwODgxNTUwNH0.7xbfd5qrI3BA0KDLsaWmbF3EAJAA4Z2rjdTrbTW-E8w",
  // Optional. Defaults to the current origin. Set this when the app is
  // served from a sub-path, or to pin the exact URL registered in Supabase.
  siteUrl: "",
  // Feature switches. All default to on once Supabase is configured.
  auth: {
    google: true,
    emailLink: true,
    apple: false
  }
};
