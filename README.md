Allo Inventory System

Hey! This is my submission for the Allo Engineering take home exercise. I built an inventory reservation system using Next.js, Prisma, and Supabase.

How to run it locally

1. Clone the repo and run npm install
2. Create a .env file and add your database connection strings for DATABASE_URL and DIRECT_URL
3. Run the migrations to set up the database tables by running npx prisma db push
4. Seed the database with some dummy products and warehouses by running npm run seed
5. Start the dev server by running npm run dev

The app will run on http://localhost:3000.

How the reservation logic works

When a user clicks reserve, the app creates a PENDING reservation in the database and holds that stock for 10 minutes. The user goes to a checkout page with a timer. If they confirm, the stock is permanently deducted. If they cancel or the timer runs out, the stock goes back.

Handling concurrency
This was the main tricky part. If there is only 1 item left and two people click reserve at the exact same millisecond, we cannot let both succeed.
To handle this, I used PostgreSQL SELECT FOR UPDATE inside a database transaction. This basically locks the specific stock row. If two requests come in at once, the database forces one to wait. The first one gets the lock, reserves the item, and finishes. The second one then gets the lock, checks the stock, sees it is empty, and safely returns a 409 error.
I went with this instead of Redis distributed locks because for a standard single database setup, native Postgres row locking is much simpler and there are fewer moving parts to break.

Expiry Cleanup

For cleaning up reservations after the 10 minutes run out, I used a hybrid approach.
First, lazy cleanup. Every time the main products API is called, it first checks for any expired reservations and releases them. This keeps the browsing numbers accurate.
Second, Vercel Cron. There is an api/cleanup route. In production, Vercel Cron hits this every minute to actively clean things up (configured in vercel.json).
Third, a safety check. The confirm API double checks the expiresAt timestamp. Even if cleanup has not run yet, an expired reservation will get rejected with a 410 error.

Bonus Idempotency

I also did the idempotency bonus for the reserve and confirm endpoints. 
Instead of Redis, I just created an IdempotencyRecord table in the database. When a request comes in with an Idempotency Key header, the server checks if it has seen it before. If it has, it just returns the saved response from last time. This prevents accidentally confirming an order twice if the users internet drops and their phone retries the request.

Trade offs and What I would do with more time

The UI is pretty basic. I focused mostly on getting the backend logic rock solid rather than making a fancy frontend.
I would add pagination to the products list. Right now it just fetches everything at once.
Real time updates would be cool (like WebSockets) so you can see stock drop instantly without refreshing.
Used Prisma v5 instead of v7 because I have found it to be much more stable.
