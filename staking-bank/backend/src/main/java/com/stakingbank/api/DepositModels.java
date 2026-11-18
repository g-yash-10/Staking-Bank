package com.stakingbank.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

public final class DepositModels {
    private DepositModels() {
    }

    public record QuoteRequest(String currency, BigDecimal amount) {
    }

    public record DepositQuote(
            String id,
            String currency,
            BigDecimal amount,
            BigDecimal rate,
            BigDecimal usdEquivalent,
            BigDecimal fee,
            BigDecimal usdtAmount,
            Instant expiresAt,
            String status) {
    }

    public record Treasury(BigDecimal available, BigDecimal reserved, BigDecimal allocated) {
    }

    public record Ledger(BigDecimal usdtBalance) {
    }

    public record BootstrapResponse(
            Map<String, BigDecimal> fiatRates,
            Treasury treasury,
            Ledger ledger) {
    }

    public record DepositActionResponse(DepositQuote quote, Treasury treasury, Ledger ledger) {
    }

    public record ApiError(String message, int status) {
    }
}
