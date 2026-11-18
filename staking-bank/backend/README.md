# Staking Bank API

The Spring Boot API owns fiat quote calculation and the demo treasury/ledger state. The existing React app calls this API; the Solidity contracts and Truffle deployment remain separate.

## Run

Requires Java 17 and Maven 3.8 or newer.

```powershell
cd backend
mvn spring-boot:run
```

In another terminal, run the React app from the `staking-bank` project directory with `npm start`. The API listens on port 8080, and the React development server proxies `/api` requests to it.

## API

- `GET /api/v1/deposits/bootstrap` returns currencies, treasury balances, and the demo ledger balance.
- `POST /api/v1/deposits/quotes` creates a 10-minute quote. Body: `{"currency":"INR","amount":25000}`.
- `POST /api/v1/deposits/quotes/{id}/confirm` reserves treasury inventory and marks payment pending.
- `POST /api/v1/deposits/quotes/{id}/complete` completes the demo payment and credits the ledger.
- `POST /api/v1/deposits/quotes/{id}/expire` expires an unconfirmed quote.

This backend intentionally uses in-memory demo state and a simulated payment confirmation; state resets when the process restarts. It is not a production payment processor or persistent ledger.
