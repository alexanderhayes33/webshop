#!/bin/bash

# ตั้งค่า UFW Firewall สำหรับ 168VAPE

if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  กรุณารันด้วย sudo"
    exit 1
fi

echo "🔥 ตั้งค่า Firewall..."

# เปิดพอร์ตพื้นฐาน
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# เปิดใช้งาน firewall
ufw --force enable

# แสดงสถานะ
ufw status

echo "✅ ตั้งค่า Firewall เสร็จสมบูรณ์!"

