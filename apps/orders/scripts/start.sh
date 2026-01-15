#!/bin/sh
set -e

echo "Waiting for database to be ready..."
until node -e "require('pg').Client.prototype.connect.call(new (require('pg').Client)({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_NAME})).then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "Database is ready!"

echo "Running migrations..."
npm run migration:run

echo "Starting application..."
exec node dist/main
