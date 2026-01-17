#!/bin/bash

set -e

echo "🚀 เริ่มติดตั้ง 168VAPE บน Ubuntu..."

# ตรวจสอบว่าเป็น root หรือไม่
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  กรุณารันด้วย sudo"
    exit 1
fi

# อัพเดทระบบ
echo "📦 อัพเดทระบบ..."
apt update && apt upgrade -y

# ติดตั้ง dependencies
echo "📦 ติดตั้ง Node.js, Nginx, Certbot..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx

# สร้างโฟลเดอร์สำหรับแอป
echo "📁 สร้างโฟลเดอร์..."
mkdir -p /var/www/168vape
chown -R www-data:www-data /var/www/168vape

# คัดลอกไฟล์แอป (ต้องอัพโหลดไฟล์เอง)
echo "📋 คัดลอกไฟล์แอป..."
echo "⚠️  หมายเหตุ: คุณต้องอัพโหลดไฟล์แอปไปที่ /var/www/168vape ก่อน"

# ติดตั้ง dependencies
echo "📦 ติดตั้ง npm packages..."
cd /var/www/168vape
npm install --production

# Build แอป
echo "🔨 Build แอป..."
npm run build

# คัดลอก Nginx config
echo "⚙️  ตั้งค่า Nginx..."
cp deployment/nginx.conf /etc/nginx/sites-available/168vape
ln -sf /etc/nginx/sites-available/168vape /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# ทดสอบ Nginx config
nginx -t

# ตั้งค่า Systemd service
echo "⚙️  ตั้งค่า Systemd service..."
cp deployment/168vape.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable 168vape
systemctl start 168vape

# เริ่ม Nginx
systemctl restart nginx

# ขอ SSL certificate
echo "🔒 ขอ SSL certificate..."
certbot --nginx -d app.vape168.com --non-interactive --agree-tos --email admin@vape168.com

# Restart services
systemctl restart nginx
systemctl restart 168vape

echo "✅ ติดตั้งเสร็จสมบูรณ์!"
echo "🌐 ตรวจสอบที่: https://app.vape168.com"
echo ""
echo "📝 คำสั่งที่มีประโยชน์:"
echo "  - ดู logs: journalctl -u 168vape -f"
echo "  - Restart: systemctl restart 168vape"
echo "  - Status: systemctl status 168vape"
echo ""
echo "☁️  ตั้งค่า Cloudflare:"
echo "  1. เพิ่ม A Record: app → 188.166.222.226 (Proxied)"
echo "  2. SSL/TLS → Full (strict) mode"
echo "  3. เปิด Always Use HTTPS"

