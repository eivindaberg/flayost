Flayost - the family's French cheese rating app (single-file web app)
======================================================================
Flayosc + ost = Flayost. Vivino for fransk ost.

WHAT THIS IS
------------
index.html is a complete, self-contained web app:
- All HTML, CSS and JavaScript are inline in this one file.
- Only external dependency: the supabase-js CDN script (same as Mattespill).
- No build step. It runs by opening the file directly, and on any static web host.

WHAT IT DOES (one thing, done really well)
------------------------------------------
The family (4 adults, 6 kids) rates every French cheese they taste, on a
shared board. Everyone rates 1-5 by tapping an emoji: 🤢 😕 🙂 😋 🤩.
One tap total for the kids; adults can add a tasting note. Cheese cards show
photo, type, average score and who hasn't tasted yet. Sort by best / newest /
not-yet-tasted. iPad-first, Norwegian UI.

AUTH / BACKEND
--------------
Same model as Mattespill: no real accounts. Each family member picks a name,
an emoji avatar and a 4-digit PIN. Data lives in the same Supabase project as
Mattespill (tables prefixed flayost_). The tables are fully locked down (RLS,
no policies); all reads/writes go through security-definer RPC functions that
verify name + PIN first - see supabase/migrations/00000000000001_flayost.sql.
The publishable anon key in index.html can only call those RPCs.

The board is cached in localStorage so the app paints instantly and taps feel
immediate (optimistic UI); failed writes are queued and retried automatically,
so ratings survive flaky holiday-house Wi-Fi.

HOW IT'S PUBLISHED
------------------
GitHub Pages: repo eivindaberg/flayost, CNAME flayost.eivindberg.no
(DNS: flayost CNAME -> eivindaberg.github.io, same setup as mattespill).
Also on Vercel: https://flayost.vercel.app (project linked to the GitHub
repo, so every push deploys to both hosts automatically).

Safe to open: it's a single plain .html file, no executables.
