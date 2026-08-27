@echo off
REM FundingSathi CRM - Vercel Deployment Checklist
REM
REM Follow these steps to deploy your frontend to Vercel

setlocal enabledelayedexpansion

cls

echo.
echo ==========================================
echo   FundingSathi CRM - Vercel Deployment
echo ==========================================
echo.

:MENU
echo.
echo STEP-BY-STEP DEPLOYMENT CHECKLIST
echo.
echo [ ] 1. Prerequisites
echo [ ] 2. Vercel Account Setup
echo [ ] 3. GitHub Connection
echo [ ] 4. Create Vercel Project
echo [ ] 5. Configure Build Settings
echo [ ] 6. Set Environment Variables
echo [ ] 7. Deploy
echo [ ] 8. Verify Deployment
echo.

echo ==========================================
echo STEP 1: Prerequisites
echo ==========================================
echo.
echo You need:
echo   [ ] GitHub account with access to: https://github.com/Preeti54444/CRM
echo   [ ] Vercel account (free at https://vercel.com)
echo   [ ] Your domain name (e.g., fundingsathi.com)
echo   [ ] VPS IP address where backend will run
echo.
echo Press any key when ready...
pause >nul

cls
echo ==========================================
echo STEP 2: Vercel Account Setup
echo ==========================================
echo.
echo Open your browser and go to: https://vercel.com
echo.
echo 1. Click "Sign Up"
echo 2. Choose "GitHub" as auth method
echo 3. Authorize Vercel to access your GitHub account
echo 4. Complete signup
echo.
echo Press any key when done...
pause >nul

cls
echo ==========================================
echo STEP 3: GitHub Connection
echo ==========================================
echo.
echo Vercel should now have access to your GitHub repository:
echo https://github.com/Preeti54444/CRM
echo.
echo This was done automatically in Step 2.
echo.
echo Press any key to continue...
pause >nul

cls
echo ==========================================
echo STEP 4: Create Vercel Project
echo ==========================================
echo.
echo In your Vercel dashboard:
echo.
echo 1. Click "Add New" in top right
echo 2. Select "Project"
echo 3. Look for "CRM" repository
echo 4. Click "Import"
echo.
echo Press any key when done...
pause >nul

cls
echo ==========================================
echo STEP 5: Configure Build Settings
echo ==========================================
echo.
echo In the "Configure Project" dialog:
echo.
echo Framework Preset:
echo   Select: "Other" (or leave blank)
echo.
echo Build Command:
echo   Enter: node vercel-build.js
echo.
echo Output Directory:
echo   Enter: dist
echo.
echo Install Command:
echo   Enter: echo No dependencies
echo.
echo Then click "Deploy"
echo.
echo Press any key when done...
pause >nul

cls
echo ==========================================
echo STEP 6: Set Environment Variables
echo ==========================================
echo.
echo After deployment completes:
echo.
echo 1. Go to your Vercel Project Settings
echo 2. Click "Environment Variables" on the left
echo 3. Add a new variable:
echo.
echo    Name: VITE_API_URL
echo    Value: https://api.YOUR-DOMAIN.com
echo.
echo    (Replace YOUR-DOMAIN.com with your actual domain)
echo.
echo 4. Select "Production" environment
echo 5. Click "Save"
echo.
echo Press any key when done...
pause >nul

cls
echo ==========================================
echo STEP 7: Deploy
echo ==========================================
echo.
echo Your frontend will automatically redeploy whenever you push to GitHub:
echo.
echo Command:
echo   git add .
echo   git commit -m "Your message"
echo   git push origin master
echo.
echo Vercel will:
echo   1. Detect the push
echo   2. Run: node vercel-build.js
echo   3. Upload dist/ to CDN
echo   4. Assign your Vercel URL
echo.
echo Press any key to continue...
pause >nul

cls
echo ==========================================
echo STEP 8: Verify Deployment
echo ==========================================
echo.
echo After deployment:
echo.
echo 1. In Vercel dashboard, get your frontend URL
echo    Format: https://your-project-name.vercel.app
echo.
echo 2. Open in browser - should see login page
echo.
echo 3. Open Developer Console (F12)
echo.
echo 4. In Console tab, paste this and press Enter:
echo.
echo    fetch('https://api.YOUR-DOMAIN.com/health')
echo      .then(r =^> r.json())
echo      .then(d =^> console.log('Success:', d))
echo      .catch(e =^> console.error('Error:', e))
echo.
echo    You should see: Success: {status: 'ok'}
echo.
echo Press any key to continue...
pause >nul

cls
echo ==========================================
echo DEPLOYMENT COMPLETE!
echo ==========================================
echo.
echo Your frontend is now deployed on Vercel!
echo.
echo Next: Deploy the backend to your VPS
echo.
echo On your VPS, run:
echo   bash deploy-vps.sh
echo.
echo This will:
echo   1. Install Docker
echo   2. Clone the repository
echo   3. Set up SSL certificates
echo   4. Start FastAPI backend
echo   5. Start PostgreSQL database
echo.
echo For more details, see:
echo   IMPLEMENTATION_QUICK_START.md
echo.
echo Press any key to exit...
pause >nul
