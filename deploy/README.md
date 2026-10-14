# NEYU Health — go-live on the on-prem server (neyuhealth.com)

**Stack:** Next.js 15 (Node 20 LTS), Prisma + PostgreSQL 16, PM2, Nginx, Let's Encrypt. Repo: `arshdeepsingh11/Neyu-AI`, branch **`japanese-style`**.

## 1. Server (Ubuntu 22/24, 2 vCPU, 4 GB RAM, 40 GB disk is enough to start)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs nginx git certbot python3-certbot-nginx postgresql-16 postgresql-client-16
sudo npm i -g pm2
sudo mkdir -p /var/www/neyu /var/lib/neyu && sudo chown -R $USER /var/www/neyu /var/lib/neyu
git clone -b japanese-style https://github.com/arshdeepsingh11/Neyu-AI.git /var/www/neyu
```

### PostgreSQL (once)
```bash
sudo -u postgres psql -c "CREATE USER neyu WITH PASSWORD 'STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE neyu OWNER neyu;"
```
Put the same password in `DATABASE_URL` in `.env`. PostgreSQL listens on localhost only (default) — keep it that way.

### Moving from the old SQLite file (one time, Phase 9)
```bash
pm2 stop neyu-health                                   # short maintenance window
cp /var/lib/neyu/neyu.db /var/backups/neyu-before-postgres.db
npx prisma migrate deploy                              # creates all tables
npm run db:import -- /var/lib/neyu/neyu.db             # copies + verifies every table
npm run db:seed                                        # first super admin (password printed once)
bash deploy/deploy.sh
```
Keep the SQLite file for 30 days as a fallback.

## 2. Secrets
Copy `deploy/env.production.example` to `/var/www/neyu/.env` and fill it in. Arsh sends the real values **privately** (not email/chat in plain text). `chmod 600 .env`.

## 3. Build and start
```bash
cd /var/www/neyu && bash deploy/deploy.sh
pm2 startup   # follow the printed command, so it starts after reboot
```

## 4. Domain + HTTPS
- DNS: `A neyuhealth.com → server public IP`, `CNAME www → neyuhealth.com`.
- `sudo cp deploy/nginx-neyuhealth.conf /etc/nginx/sites-available/neyuhealth.com && sudo ln -s /etc/nginx/sites-available/neyuhealth.com /etc/nginx/sites-enabled/`
- `sudo certbot --nginx -d neyuhealth.com -d www.neyuhealth.com && sudo nginx -t && sudo systemctl reload nginx`
- Firewall: open 80 and 443 only. Port 3000 stays private.
- No public IP? Use Cloudflare Tunnel to `http://localhost:3000` instead of steps above.

## 5. Daily jobs (crontab -e)
```
0 6 * * *   curl -s -H "Authorization: Bearer $CRON_SECRET" https://neyuhealth.com/api/cron/daily > /dev/null
15 2 * * *  /var/www/neyu/deploy/backup.sh
```
(Put the real CRON_SECRET value in the cron line.)

## 6. Check after launch
- https://neyuhealth.com loads, https://neyuhealth.com/robots.txt and /sitemap.xml work.
- Sign up in My Health, receive the email code, add a report, create a Doctor Report PDF.
- `/admin` login works.
- Submit `https://neyuhealth.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Updates later
`cd /var/www/neyu && bash deploy/deploy.sh`
