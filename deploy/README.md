# NEYU Health — go-live on the on-prem server (neyuhealth.com)

**Stack:** Next.js 15 (Node 20 LTS), Prisma + SQLite (one file), PM2, Nginx, Let's Encrypt. Repo: `arshdeepsingh11/ANRAHealth-New`, branch **`japanese-style`**.

## 1. Server (Ubuntu 22/24, 2 vCPU, 4 GB RAM, 40 GB disk is enough to start)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs nginx sqlite3 git certbot python3-certbot-nginx
sudo npm i -g pm2
sudo mkdir -p /var/www/neyu /var/lib/neyu && sudo chown -R $USER /var/www/neyu /var/lib/neyu
git clone -b japanese-style https://github.com/arshdeepsingh11/ANRAHealth-New.git /var/www/neyu
```

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
