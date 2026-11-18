package com.stakingbank.api;

import com.stakingbank.api.DepositModels.DepositActionResponse;
import com.stakingbank.api.DepositModels.DepositQuote;
import com.stakingbank.api.DepositModels.QuoteRequest;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DepositServiceTest {
    @Test
    void quoteUsesConfiguredRateAndFee() {
        DepositService service = new DepositService();

        DepositQuote quote = service.createQuote(new QuoteRequest("INR", new BigDecimal("25000")));

        assertEquals(new BigDecimal("83.4200"), quote.rate());
        assertEquals(new BigDecimal("299.69"), quote.usdEquivalent());
        assertEquals(new BigDecimal("4.1957"), quote.fee());
        assertEquals(new BigDecimal("295.4943"), quote.usdtAmount());
    }

    @Test
    void confirmationAndCompletionUpdateTreasuryAndLedgerOnce() {
        DepositService service = new DepositService();
        DepositQuote quote = service.createQuote(new QuoteRequest("USD", new BigDecimal("100")));

        DepositActionResponse pending = service.confirmQuote(quote.id());
        assertEquals("PAYMENT_PENDING", pending.quote().status());
        assertEquals(new BigDecimal("349901.4000"), pending.treasury().available());
        assertEquals(new BigDecimal("18098.6000"), pending.treasury().reserved());

        DepositActionResponse completed = service.completeQuote(quote.id());
        assertEquals("COMPLETED", completed.quote().status());
        assertEquals(new BigDecimal("125098.6000"), completed.treasury().allocated());
        assertEquals(new BigDecimal("48348.6000"), completed.ledger().usdtBalance());
        assertThrows(ResponseStatusException.class, () -> service.completeQuote(quote.id()));
    }

    @Test
    void invalidAmountsAndCurrenciesAreRejected() {
        DepositService service = new DepositService();

        assertThrows(ResponseStatusException.class,
                () -> service.createQuote(new QuoteRequest("INR", BigDecimal.ZERO)));
        assertThrows(ResponseStatusException.class,
                () -> service.createQuote(new QuoteRequest("INR", new BigDecimal("0.001"))));
        assertThrows(ResponseStatusException.class,
                () -> service.createQuote(new QuoteRequest("CAD", BigDecimal.ONE)));
    }
}
