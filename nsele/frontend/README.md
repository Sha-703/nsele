
Frontend Next.js - Nsele

Install:
npm install

Run dev:
npm run dev

Le frontend se connecte au broker MQTT via WebSocket (ex: ws://localhost:9001).

Notes:
- API backend attendu sur `http://localhost:5000`.
- Broker MQTT doit exposer WebSocket sur `ws://localhost:9001` (ex: mosquitto + listener WebSocket).
