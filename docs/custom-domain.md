# Bukidnon portal custom domain

Requested hostname: `bettergov.transparency-portal.orvyx.online`.

The hostname is attached to the Vercel `transparency-portal` project. `orvyx.online` uses Hostinger nameservers, but this subdomain has no DNS record yet. Vercel cannot serve the requested hostname until the record below resolves publicly.

When the parent domain is registered and its DNS zone is active, add this record at the provider managing its authoritative DNS:

| Type | Name/host | Target/value | TTL |
| --- | --- | --- | --- |
| CNAME | `bettergov.transparency-portal` | `0feaea30271f93c8.vercel-dns-017.com.` | Default |

In Hostinger, use **Domains → Domain portfolio → orvyx.online → DNS / Nameservers → DNS records**. Enter only `bettergov.transparency-portal` in the host field; Hostinger appends `.orvyx.online`. Do not create a separate Hostinger-hosted website for this subdomain. Leave the existing `orvyx.online` and `www.orvyx.online` records alone.

Then verify:

```bash
dig +short CNAME bettergov.transparency-portal.orvyx.online
vercel domains verify bettergov.transparency-portal.orvyx.online
curl -I https://bettergov.transparency-portal.orvyx.online/
```

Vercel should report a valid configuration and the HTTPS request should succeed before changing `portal.config.ts` `siteUrl` or making the new hostname primary. Check the current recommended DNS value in Vercel if the domain is ever removed and reattached.
