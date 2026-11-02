# Bukidnon 1st DEO portal custom domain

Requested hostname: `bettergov.transparency-portal.orvyx.online`.

The hostname is attached to the Vercel `transparency-portal` project. `orvyx.online` uses Hostinger nameservers. On 1 November 2026, Vercel verified the DNS configuration and the hostname returned HTTP 200 over HTTPS. `portal.config.ts` now uses it as the canonical site URL.

When the parent domain is registered and its DNS zone is active, add this record at the provider managing its authoritative DNS:

| Type | Name/host | Target/value | TTL |
| --- | --- | --- | --- |
| CNAME | `bettergov.transparency-portal` | `0feaea30271f93c8.vercel-dns-017.com.` | Default |

In Hostinger, use **Domains → Domain portfolio → orvyx.online → DNS / Nameservers → DNS records**. Enter only `bettergov.transparency-portal` in the host field; Hostinger appends `.orvyx.online`. Do not create a separate Hostinger-hosted website for this subdomain. Leave the existing `orvyx.online` and `www.orvyx.online` records alone.

To verify again after a DNS change:

```bash
dig +short CNAME bettergov.transparency-portal.orvyx.online
vercel domains verify bettergov.transparency-portal.orvyx.online
curl -I https://bettergov.transparency-portal.orvyx.online/
```

Vercel should report a valid configuration and the HTTPS request should succeed. Check the current recommended DNS value in Vercel if the domain is ever removed and reattached. The `transparency-portal-sable.vercel.app` alias points to this deployment but requires Vercel team sign-in under the project's current SSO protection. Use the custom domain for public links.

## Bukidnon-wide portal

The separate Vercel project `bukidnon-transparency-portal` uses `bukidnon.transparency-portal.orvyx.online`. In Hostinger's DNS zone for `orvyx.online`, add:

| Type | Name/host | Target/value | TTL |
| --- | --- | --- | --- |
| CNAME | `bukidnon.transparency-portal` | `99cc987d0d00987b.vercel-dns-017.com.` | Default |

Vercel supplied this project-specific target on 2 November 2026. Keep the original `bettergov.transparency-portal` record for the DEO portal. After the new record propagates, run `vercel domains verify bukidnon.transparency-portal.orvyx.online` and check the HTTPS page and its `/about` route. Recheck Vercel's recommended value if the hostname is ever detached and added again.
