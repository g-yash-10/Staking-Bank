import React, { useEffect, useMemo, useState } from 'react';
import {
  completeQuote,
  confirmQuote,
  createQuote,
  expireQuote,
  getBootstrap,
} from './depositApi';

const defaultForm = {
  currency: 'INR',
  amount: '25000',
};

function formatBalance(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUsdt(value) {
  return `${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} USDT`;
}

function formatCountdown(expiresAt, now) {
  const remainingMs = Math.max(new Date(expiresAt).getTime() - now, 0);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds}s`;
}

export default function App() {
  const [currency, setCurrency] = useState(defaultForm.currency);
  const [amount, setAmount] = useState(defaultForm.amount);
  const [fiatRates, setFiatRates] = useState({});
  const [treasury, setTreasury] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [quote, setQuote] = useState(null);
  const [status, setStatus] = useState('IDLE');
  const [message, setMessage] = useState('Select a fiat amount and generate a quote.');
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getBootstrap()
      .then((bootstrap) => {
        setFiatRates(bootstrap.fiatRates);
        setTreasury(bootstrap.treasury);
        setLedger(bootstrap.ledger);
        setLoading(false);
      })
      .catch((error) => {
        setStatus('ERROR');
        setMessage(error.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!quote) {
      return undefined;
    }

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [quote]);

  const timeRemaining = useMemo(() => {
    if (!quote) {
      return '—';
    }

    return formatCountdown(quote.expiresAt, now);
  }, [quote, now]);

  async function handleGenerateQuote() {
    setSubmitting(true);
    try {
      const nextQuote = await createQuote(currency, amount);
      setQuote(nextQuote);
      setStatus('INITIATED');
      setMessage(`Quote created for ${nextQuote.amount} ${currency}. Review and confirm the payment.`);
    } catch (error) {
      setStatus('ERROR');
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmQuote() {
    if (!quote) {
      return;
    }

    setSubmitting(true);
    try {
      const pending = await confirmQuote(quote.id);
      setQuote(pending.quote);
      setTreasury(pending.treasury);
      setLedger(pending.ledger);
      setStatus(pending.quote.status);
      setMessage(`Awaiting payment verification for ${formatUsdt(pending.quote.usdtAmount)}.`);

      window.setTimeout(async () => {
        try {
          const completed = await completeQuote(quote.id);
          setQuote(completed.quote);
          setTreasury(completed.treasury);
          setLedger(completed.ledger);
          setStatus(completed.quote.status);
          setMessage(`Payment confirmed. ${formatUsdt(completed.quote.usdtAmount)} was credited to the user's internal ledger.`);
        } catch (error) {
          setStatus('ERROR');
          setMessage(error.message);
        } finally {
          setSubmitting(false);
        }
      }, 1500);
    } catch (error) {
      setStatus('ERROR');
      setMessage(error.message);
      setSubmitting(false);
    }
  }

  async function handleExpireQuote() {
    if (!quote) {
      return;
    }

    setSubmitting(true);
    try {
      const expired = await expireQuote(quote.id);
      setQuote(expired.quote);
      setTreasury(expired.treasury);
      setLedger(expired.ledger);
      setStatus(expired.quote.status);
      setMessage('Quote expired; no treasury was reserved.');
    } catch (error) {
      setStatus('ERROR');
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setQuote(null);
    setStatus('IDLE');
    setMessage('Select a fiat amount and generate a quote.');
    setAmount(defaultForm.amount);
    setCurrency(defaultForm.currency);
  }

  return (
    <div className="container my-4">
      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
              <p className="text-uppercase text-muted mb-1">Fiat funding channel</p>
              <h2 className="mb-0">Fiat-to-USDT Deposit System</h2>
            </div>
            <span className="badge badge-success p-2">Treasury-backed</span>
          </div>

          <div className="row mb-4">
            <div className="col-md-3 mb-3">
              <div className="card bg-light h-100">
                <div className="card-body">
                  <div className="text-muted small">Available USDT</div>
                  <div className="h4 mb-0 mt-2">{treasury ? formatUsdt(treasury.available) : 'Loading…'}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card bg-light h-100">
                <div className="card-body">
                  <div className="text-muted small">Reserved USDT</div>
                  <div className="h4 mb-0 mt-2">{treasury ? formatUsdt(treasury.reserved) : 'Loading…'}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card bg-light h-100">
                <div className="card-body">
                  <div className="text-muted small">Allocated USDT</div>
                  <div className="h4 mb-0 mt-2">{treasury ? formatUsdt(treasury.allocated) : 'Loading…'}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card bg-light h-100">
                <div className="card-body">
                  <div className="text-muted small">User ledger</div>
                  <div className="h4 mb-0 mt-2">{ledger ? formatUsdt(ledger.usdtBalance) : 'Loading…'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-5 mb-4">
              <div className="card h-100 border-0 bg-light">
                <div className="card-body p-4">
                  <h4 className="mb-3">Deposit quote</h4>

                  <div className="form-group">
                    <label>Local currency</label>
                    <select
                      className="form-control"
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                    >
                      {Object.keys(fiatRates).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group mt-3">
                    <label>Deposit amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>

                  <div className="d-flex gap-2 mt-4 flex-wrap">
                    <button
                      className="btn btn-primary"
                      onClick={handleGenerateQuote}
                      disabled={loading || submitting || !treasury}
                    >
                      Generate quote
                    </button>
                    <button className="btn btn-outline-secondary" onClick={handleReset} disabled={submitting}>
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-7">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
                    <h4 className="mb-0">Transaction status</h4>
                    <span className="badge badge-info p-2 text-uppercase">{status}</span>
                  </div>

                  <div className="alert alert-light border mb-3">
                    {message}
                  </div>

                  {quote && (
                    <div>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <div className="small text-muted">Exchange rate</div>
                          <div className="font-weight-bold">1 USD = {quote.rate} {quote.currency}</div>
                        </div>
                        <div className="col-md-6 mb-3">
                          <div className="small text-muted">Quote expiry</div>
                          <div className="font-weight-bold">{timeRemaining}</div>
                        </div>
                        <div className="col-md-6 mb-3">
                          <div className="small text-muted">Fiat input</div>
                          <div className="font-weight-bold">{formatBalance(quote.amount)} {quote.currency}</div>
                        </div>
                        <div className="col-md-6 mb-3">
                          <div className="small text-muted">Converted USD value</div>
                          <div className="font-weight-bold">{formatBalance(quote.usdEquivalent)} USD</div>
                        </div>
                        <div className="col-md-6 mb-3">
                          <div className="small text-muted">Service fee</div>
                          <div className="font-weight-bold">{formatBalance(quote.fee)} USD</div>
                        </div>
                        <div className="col-md-6 mb-3">
                          <div className="small text-muted">Equivalent USDT</div>
                          <div className="font-weight-bold">{formatUsdt(quote.usdtAmount)}</div>
                        </div>
                      </div>

                      <div className="d-flex gap-2 mt-3 flex-wrap">
                        <button
                          className="btn btn-success"
                          onClick={handleConfirmQuote}
                          disabled={submitting || status !== 'INITIATED'}
                        >
                          Confirm payment
                        </button>
                        <button
                          className="btn btn-outline-warning"
                          onClick={handleExpireQuote}
                          disabled={submitting || status !== 'INITIATED'}
                        >
                          Expire quote
                        </button>
                      </div>
                    </div>
                  )}

                  {!quote && (
                    <div className="text-muted mt-3">
                      No active quote yet. Generate one to begin the bank's fiat settlement flow.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-light rounded p-3 border">
        <h5>Lifecycle flow</h5>
        <div className="d-flex flex-wrap gap-2 mt-3">
          {['INITIATED', 'PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'COMPLETED'].map((state) => (
            <span
              key={state}
              className={`badge p-2 ${status === state ? 'badge-primary' : 'badge-secondary'}`}
            >
              {state}
            </span>
          ))}
        </div>
        <p className="mt-3 mb-0 text-muted small">
          The bank reserves treasury USDT, verifies the payment, allocates the inventory, and credits the internal ledger without on-chain crypto transfer.
        </p>
      </div>
    </div>
  );
}
