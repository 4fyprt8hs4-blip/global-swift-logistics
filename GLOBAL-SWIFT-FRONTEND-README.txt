GLOBAL SWIFT LOGISTICS — FRONTEND FILES

This ZIP contains the website's frontend files. It includes the public home page, shipment tracking page, and admin dashboard interface.

FILES
- index.html       Home page
- style.css        Main site styles
- app.js           Main site interactions
- tracking.html    Shipment tracking page
- tracking.css     Tracking page styles
- tracking.js      Tracking page interactions
- admin.html       Admin dashboard
- admin.css        Admin dashboard styles
- admin.js         Admin dashboard interactions

IMPORTANT
1. GitHub does not automatically unpack a ZIP when you upload it. Extract the ZIP first, then upload the individual files into your repository's public folder (or upload them into the repository root if you are publishing a static-only demo, while keeping the file paths consistent).
2. The admin dashboard and shipment lookup need the Node.js backend and database to be hosted and configured. GitHub Pages alone cannot run the API or database. The admin page will not create real shipments until the backend is deployed and its API routes are available at the same origin, or the frontend API URLs are configured for your backend host.
3. Do not upload your .env file, passwords, API keys, or database credentials to GitHub.
