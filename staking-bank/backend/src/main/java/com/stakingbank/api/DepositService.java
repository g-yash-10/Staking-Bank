package com.stakingbank.api;

import com.stakingbank.api.DepositModels.BootstrapResponse;
import com.stakingbank.api.DepositModels.DepositActionResponse;
import com.stakingbank.api.DepositModels.DepositQuote;
import com.stakingbank.api.DepositModels.Ledger;
import com.stakingbank.api.DepositModels.QuoteRequest;
import com.stakingbank.api.DepositModels.Treasury;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DepositService {
    private static final BigDecimal FEE_RATE = new BigDecimal("0.014");
    private static final Duration QUOTE_LIFETIME = Duration.ofMinutes(10);
    private static final Map<String, BigDecimal> FIAT_RATES = Map.of(
            "INR", new BigDecimal("83.42"),
            "USD", BigDecimal.ONE,
            "EUR", new BigDecimal("0.92"),
            "GBP", new BigDecimal("0.79"),
            "AED", new BigDecimal("3.67"));

    private final Map<String, DepositQuote> quotes = new ConcurrentHashMap<>();
    private BigDecimal available = new BigDecimal("350000.0000");
    private BigDecimal reserved = new BigDecimal("18000.0000");
    private BigDecimal allocated = new BigDecimal("125000.0000");
    private BigDecimal ledgerBalance = new BigDecimal("48250.0000");

    public synchronized BootstrapResponse getBootstrap() {
        return new BootstrapResponse(FIAT_RATES, treasury(), ledger());
    }

    public synchronized DepositQuote createQuote(QuoteRequest request) {
        if (request == null || request.currency() == null || request.amount() == null) {
            throw badRequest("Currency and amount are required.");
        }

        BigDecimal rate = FIAT_RATES.get(request.currency());
        if (rate == null) {
            throw badRequest("Unsupported currency: " + request.currency());
        }
        if (request.amount().signum() <= 0) {
            throw badRequest("Deposit amount must be greater than zero.");
        }

        BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);
        if (amount.signum() <= 0) {
            throw badRequest("Deposit amount must be at least 0.01.");
        }
        BigDecimal usdEquivalent = amount.divide(rate, 2, RoundingMode.HALF_UP);
        BigDecimal fee = usdEquivalent.multiply(FEE_RATE).setScale(4, RoundingMode.HALF_UP);
        BigDecimal usdtAmount = usdEquivalent.subtract(fee).setScale(4, RoundingMode.HALF_UP);
        DepositQuote quote = new DepositQuote(
                UUID.randomUUID().toString(),
                request.currency(),
                amount,
                rate.setScale(4, RoundingMode.HALF_UP),
                usdEquivalent,
                fee,
                usdtAmount,
                Instant.now().plus(QUOTE_LIFETIME),
                "INITIATED");
        quotes.put(quote.id(), quote);
        return quote;
    }

    public synchronized DepositActionResponse confirmQuote(String id) {
        DepositQuote quote = requireQuote(id);
        requireStatus(quote, "INITIATED");
        if (!quote.expiresAt().isAfter(Instant.now())) {
            updateStatus(quote, "EXPIRED");
            throw conflict("Quote has expired.");
        }
        if (available.compareTo(quote.usdtAmount()) < 0) {
            throw conflict("Insufficient treasury inventory for this deposit.");
        }

        available = available.subtract(quote.usdtAmount()).setScale(4, RoundingMode.HALF_UP);
        reserved = reserved.add(quote.usdtAmount()).setScale(4, RoundingMode.HALF_UP);
        quote = updateStatus(quote, "PAYMENT_PENDING");
        return response(quote);
    }

    public synchronized DepositActionResponse completeQuote(String id) {
        DepositQuote quote = requireQuote(id);
        requireStatus(quote, "PAYMENT_PENDING");

        reserved = reserved.subtract(quote.usdtAmount()).setScale(4, RoundingMode.HALF_UP);
        allocated = allocated.add(quote.usdtAmount()).setScale(4, RoundingMode.HALF_UP);
        ledgerBalance = ledgerBalance.add(quote.usdtAmount()).setScale(4, RoundingMode.HALF_UP);
        quote = updateStatus(quote, "COMPLETED");
        return response(quote);
    }

    public synchronized DepositActionResponse expireQuote(String id) {
        DepositQuote quote = requireQuote(id);
        requireStatus(quote, "INITIATED");
        quote = updateStatus(quote, "EXPIRED");
        return response(quote);
    }

    private DepositQuote requireQuote(String id) {
        DepositQuote quote = quotes.get(id);
        if (quote == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Quote not found.");
        }
        return quote;
    }

    private void requireStatus(DepositQuote quote, String expected) {
        if (!expected.equals(quote.status())) {
            throw conflict("Quote cannot transition from " + quote.status() + ".");
        }
    }

    private DepositQuote updateStatus(DepositQuote quote, String status) {
        DepositQuote updated = new DepositQuote(
                quote.id(),
                quote.currency(),
                quote.amount(),
                quote.rate(),
                quote.usdEquivalent(),
                quote.fee(),
                quote.usdtAmount(),
                quote.expiresAt(),
                status);
        quotes.put(updated.id(), updated);
        return updated;
    }

    private DepositActionResponse response(DepositQuote quote) {
        return new DepositActionResponse(quote, treasury(), ledger());
    }

    private Treasury treasury() {
        return new Treasury(available, reserved, allocated);
    }

    private Ledger ledger() {
        return new Ledger(ledgerBalance);
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
