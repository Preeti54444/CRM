# VPS Deployment Script
$password = "fundingsathicrm@1"
$commands = @(
    "git clone https://github.com/Preeti54444/CRM.git",
    "cd CRM",
    "cat > .env << 'ENVEOF'",
    "ENVIRONMENT=production",
    "SECRET_KEY=e84bb91e4680d11d396909970785694a5c09fc7e9c9c142c583a2ede7d10ecf9",
    "DATABASE_URL=postgresql://crm_user:VHmO>-YzS/Q?G9LXYI#O!tW>$duioPOh@postgres:5432/crm_database",
    "ALLOWED_HOSTS=187.127.149.245,localhost",
    "FRONTEND_URL=http://187.127.149.245",
    "SMTP_HOST=smtp.gmail.com",
    "SMTP_PORT=587",
    "ENVEOF",
    "docker compose up -d --build",
    "docker compose exec backend alembic upgrade head",
    "systemctl enable docker",
    "ufw allow 80/tcp",
    "ufw allow 443/tcp",
    "ufw allow 22/tcp",
    "ufw --force enable"
)

$sshCommand = "echo '" + ($commands -join "' && echo '") + "' | ssh -o StrictHostKeyChecking=no root@187.127.149.245"
Invoke-Expression $sshCommand
