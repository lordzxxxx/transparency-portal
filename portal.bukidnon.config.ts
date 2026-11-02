/** Bukidnon-wide view. Verify with `npm run check -- --config=portal.bukidnon.config.ts`. */
import { defineConfig } from './src/config';

export default defineConfig({
  id: "bukidnon",
  kind: "province",
  name: "Province of Bukidnon",
  shortName: "Bukidnon",
  siteUrl: "https://bukidnon-transparency-portal.vercel.app/",
  buildYourOwnStrip: false,
  operator: {
    name: "ORVYX"
  },
  scope: {
    offices: [
      "Bukidnon 1st District Engineering Office",
      "Bukidnon 2nd District Engineering Office",
      "Bukidnon 3rd District Engineering Office",
      "Bukidnon 4th District Engineering Office"
    ],
    places: [
      {
        label: "Bukidnon",
        q: "Bukidnon",
        region: "X"
      }
    ],
    districts: [
      "leg:bukidnon:1st",
      "leg:bukidnon:2nd",
      "leg:bukidnon:3rd",
      "leg:bukidnon:4th"
    ],
    exclude: [
      {
        key: "dpwh:house-reading:2551",
        reason: "The title names the CDO-Airport-Bukidnon road, but BetterGov lists the line under Cagayan de Oro City 1st DEO and gives no location within Bukidnon. Excluded until a source establishes that this segment belongs in the provincial view."
      }
    ]
  },
  reporting: {
    enabled: false
  }
});
