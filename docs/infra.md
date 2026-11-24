# Infra (AWS)

The plan for deploying Connecta. **Nothing is deployed yet**: local development only until the
owner says deploy, and **only the owner provisions** cloud resources.

One app server with Docker Compose behind nginx, RDS Postgres, no load balancer, no autoscaling,
and monitoring on its own server.

```
 Users (browser)
   │  HTTPS / WSS                              │  UDP (voice, screen share)
   ▼                                           ▼
 Route 53 ──▶ App server: EC2 t4g.medium + Elastic IP (Docker Compose)
              ┌─────────────────────────────────────────────────────────┐
              │ nginx ─┬─ /         → web      (Next.js)                │
              │        ├─ /api/*    → api      (NestJS + BullMQ jobs)   │
              │        ├─ /live     → gateway  (Socket.IO)              │
              │        ├─ /game     → game     (Colyseus)               │
              │        └─ rtc.*     → livekit  (+ UDP ports)            │
              │ certbot · redis · alloy · cAdvisor                      │
              └───┬───────────────┬──────────────────────┬──────────────┘
                  │ private       │ HTTPS out            │ private: metrics, logs
            RDS Postgres    S3 + CloudFront       Monitoring server: EC2 t4g.small
                            SES · Stripe          Prometheus · Loki · Grafana · Alertmanager
                            OpenAI · OAuth        nothing open to the internet
```

## Parts

- **nginx** does HTTPS (certbot, Let's Encrypt) and routing, and hides `/metrics` and internal
  routes. The browser only ever calls its own site, so cookies need no CORS.
- **Containers:** web, api (REST, sign-in, Stripe, upload links, jobs), gateway, game, livekit,
  redis (losable, no backups), alloy (logs), cAdvisor (memory and CPU per container; t4g.large is a
  one-line change).
- **Data:** RDS Postgres db.t4g.micro for everything lasting; S3 + CloudFront for chat pictures.
- **Outside services:** Stripe, SES (sign-in codes, team emails), Google and Discord OAuth, OpenAI's
  free moderation endpoint, YouTube embeds (in the browser).
- **Deploys:** GitHub Actions (check → deploy on `main`) with a GitHub OIDC role, images in ECR,
  secrets in SSM Parameter Store, deploys by SSM Run Command, Terraform run by the owner.
- **Network:** public subnet for both servers, private subnets for RDS, no NAT. Metric ports open
  only to the monitoring server; Grafana through SSM port forwarding.

## Locally

| Production     | Local (`docker compose up -d`)                                |
| -------------- | ------------------------------------------------------------- |
| RDS Postgres   | Postgres 17 container (:5433)                                 |
| Redis, LiveKit | the same containers                                           |
| S3             | AWS Emulator (in memory; `pnpm db:seed` recreates the bucket) |
| SES            | Mailpit, http://localhost:8025                                |
| SSM parameters | `apps/*/.env`                                                 |
| nginx          | Next's rewrites (`/api`, `/live`, `/game`)                    |

Code talks to AWS only through the AWS SDK with `AWS_ENDPOINT_URL`.

## Monitoring (on its own server)

So monitoring doesn't die with what it watches. Prometheus (15 days), Loki (14 days), Grafana,
Alertmanager → Discord. Metrics are pulled (a dead server shows as down); logs are pushed by Alloy.
An always-firing Watchdog alert pings a dead man's switch (healthchecks.io). Outside both servers,
a Route 53 health check and CloudWatch alarms email through SNS.

Drills to run once deployed: stop the app server, stop the monitoring server, kill the game
container, fill the disk to 90%, load test the API.

## Before launch

- SES: SPF, DKIM, DMARC and production access (email codes depend on delivery).
- S3 bucket CORS tested with a real browser upload.
- A test on a mid-range Android phone.

## Cost (Bangkok, rough)

| Part                                          | ≈ $ a month |
| --------------------------------------------- | ----------- |
| App server t4g.medium                         | 30          |
| Monitoring server t4g.small                   | 15          |
| RDS db.t4g.micro                              | 15          |
| 2 public IPv4 addresses                       | 7           |
| Disks                                         | 7           |
| S3, CloudFront, SES, Route 53, ECR, snapshots | 5           |
| **Total while running**                       | **≈ 80**    |

Plus bandwidth beyond 100 GB a month, Stripe fees and AI calls. Between playtests the stack can be
destroyed (keeping the database snapshot) for ≈ $1–2 a month.

**Not now:** load balancer, autoscaling, ECS, ElastiCache, Multi-AZ RDS, LiveKit on its own
server, WAF. Revisit when the playtest shows the app server or bandwidth is the limit.
