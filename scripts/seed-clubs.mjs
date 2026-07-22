import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const Z = "https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=80,h=80,fit=crop/AoP4G0k1ojT1BOBO/";

const CLUBS = [
  { name: "BATE:Raleigh", city: "Raleigh, NC", region: "Southeast", country: "USA", logo_url: Z + "screen-shot-2025-09-26-at-5.23.41-pm-mP43Qzo4LgSBg24G.png" },
  { name: "Atlanta Jacks", city: "Atlanta, GA", region: "Southeast", country: "USA", logo_url: Z + "atlantajacksb8-YZ9EbpwqBLuMQ8Mk.jpg" },
  { name: "New York Jacks", city: "New York, NY", region: "Northeast", country: "USA", logo_url: Z + "screen-shot-2025-09-26-at-5.09.33-pm-mP43QWRwLjH84X6m.png" },
  { name: "Stumptown Strokes", city: "Portland, OR", region: "Northwest", country: "USA", logo_url: Z + "file-Yle4yl5451IqVkvm.jpg" },
  { name: "Denver Jacks", city: "Denver, CO", region: "Mountain", country: "USA", logo_url: Z + "download-1-m7VDKZZVDRsbjvKL.jpeg" },
  { name: "Rain City Jacks", city: "Seattle, WA", region: "Northwest", country: "USA", logo_url: Z + "screen-shot-2025-09-26-at-5.27.31-pm-Yg249vPeXJu9PGXb.png" },
  { name: "Paris Jacks", city: "Paris, France", region: "International", country: "France", logo_url: Z + "screen-shot-2025-09-26-at-5.15.55-pm-dWxLbQX3vxT8rpkY.png" },
  { name: "Austin Jacks", city: "Austin, TX", region: "Southwest", country: "USA", logo_url: Z + "austinjacks_avatar-thumbnail_logo-mePgnQn9QbC628jr.webp" },
  { name: "Windy City Jacks", city: "Chicago, IL", region: "Midwest", country: "USA", logo_url: Z + "20250926_174043-m5K8bEbD55S4rJZl.jpg" },
  { name: "Boston Jacks", city: "Boston, MA", region: "Northeast", country: "USA", logo_url: "https://assets.zyrosite.com/AoP4G0k1ojT1BOBO/673fc0842999a3f2d05d17e9_horizontal-transparent-A1azJN78xlt3pRev.svg" },
  { name: "Queen City Jacks", city: "Charlotte, NC", region: "Southeast", country: "USA", logo_url: Z + "69bfc4da-5f8f-405e-958d-4bffb7126371_queencity-jacks-mxB27bw1vDhRXn58.webp" },
  { name: "Guerilla Jax", city: "San Francisco, CA", region: "Southwest", country: "USA", logo_url: Z + "download-6-d95Zgq6lDOCwNeGV.jpeg" },
  { name: "Music City Jacks", city: "Nashville, TN", region: "Southeast", country: "USA", logo_url: Z + "screen-shot-2025-09-26-at-5.08.36-pm-m7VDK96vz9TKZ7OZ.png" },
  { name: "Philly Jacks", city: "Philadelphia, PA", region: "Northeast", country: "USA", logo_url: Z + "screen-shot-2025-09-26-at-5.16.42-pm-Y4LPJ97ge9uOXBLD.png" },
  { name: "Motor City Jacks", city: "Detroit, MI", region: "Midwest", country: "USA", logo_url: Z + "c174e5_7e0d35c3ee254bec8f76aea2451aeb79~mv2-AzGM74BEpJs0qaxg.png" },
  { name: "Orlando Jacks", city: "Orlando, FL", region: "Southeast", country: "USA", logo_url: Z + "download-A1azJxQabQsP8ELk.png" },
  { name: "LAX Jacks", city: "Los Angeles, CA", region: "Southwest", country: "USA", logo_url: Z + "screen-shot-2025-09-26-at-5.03.08-pm-A1azJ9vXJqfbbBon.png" },
  { name: "Toronto Jacks", city: "Toronto, Canada", region: "International", country: "Canada", logo_url: Z + "screen-shot-2025-09-26-at-5.29.40-pm-YrD4NZoLN0fe4XrQ.png" },
  { name: "DMV Jacks", city: "Washington, DC", region: "Southeast", country: "USA", logo_url: Z + "screen-shot-2025-09-26-at-5.30.51-pm-d95Zgqyp7zT7qrJK.png" },
  { name: "Triad Jacks", city: "Greensboro, NC", region: "Southeast", country: "USA", logo_url: Z + "triad-jacks-gFTSUCzdIUrJhAtv.png" },
  { name: "Bator Bro", city: "London, England", region: "International", country: "England", logo_url: Z + "img_20250927_140816_788-dWxLy6JpgXUzxPw3.png" },
  { name: "Columbus Jacks", city: "Columbus, OH", region: "Midwest", country: "USA", logo_url: Z + "screen-shot-2025-09-26-at-4.55.44-pm-Awv8kbqk4ai9XBnm.png" },
  { name: "Neptune Jacks", city: "Norfolk, VA", region: "Southeast", country: "USA", logo_url: Z + "screen-shot-2025-09-26-at-5.10.34-pm-Aq2GobRx4EhLBjv9.png" },
  { name: "Palm Springs Jacks", city: "Palm Springs, CA", region: "Southwest", country: "USA", logo_url: Z + "screen-shot-2025-09-26-at-5.15.05-pm-YbN49go1w9uDX7Np.png" },
  { name: "Burgh Bate Buds", city: "Pittsburgh, PA", region: "Northeast", country: "USA", logo_url: Z + "burgh-bate-buds-logo-Awv8k5X2WgiJ6BK4.png" },
];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const { data: existing, error: fetchErr } = await supabase.from("clubs").select("id, name");
if (fetchErr) throw fetchErr;
const existingNames = new Set((existing || []).map((c) => c.name));

const toInsert = CLUBS.filter((c) => !existingNames.has(c.name));
if (toInsert.length === 0) {
  console.log("All clubs already seeded.");
} else {
  const { data: inserted, error } = await supabase.from("clubs").insert(toInsert).select("id, name");
  if (error) throw error;
  console.log(`Inserted ${inserted.length} clubs.`);
}

const { data: allClubs, error: allErr } = await supabase.from("clubs").select("id, name, city");
if (allErr) throw allErr;

const qrRows = [];
for (const club of allClubs) {
  const { data: existingQr } = await supabase.from("qr_codes").select("id").eq("club_id", club.id).limit(1);
  if (existingQr && existingQr.length > 0) continue;
  qrRows.push({ club_id: club.id, code: `${slugify(club.name)}-${club.id.slice(0, 4)}` });
}
if (qrRows.length > 0) {
  const { error: qrErr } = await supabase.from("qr_codes").insert(qrRows);
  if (qrErr) throw qrErr;
  console.log(`Created ${qrRows.length} QR codes.`);
} else {
  console.log("All clubs already have QR codes.");
}

console.log(`Total clubs in DB: ${allClubs.length}`);
