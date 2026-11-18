package com.stakingbank.api;

import com.stakingbank.api.DepositModels.BootstrapResponse;
import com.stakingbank.api.DepositModels.DepositActionResponse;
import com.stakingbank.api.DepositModels.DepositQuote;
import com.stakingbank.api.DepositModels.QuoteRequest;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/deposits")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class DepositController {
    private final DepositService depositService;

    public DepositController(DepositService depositService) {
        this.depositService = depositService;
    }

    @GetMapping("/bootstrap")
    public BootstrapResponse getBootstrap() {
        return depositService.getBootstrap();
    }

    @PostMapping("/quotes")
    public DepositQuote createQuote(@RequestBody QuoteRequest request) {
        return depositService.createQuote(request);
    }

    @PostMapping("/quotes/{id}/confirm")
    public DepositActionResponse confirmQuote(@PathVariable String id) {
        return depositService.confirmQuote(id);
    }

    @PostMapping("/quotes/{id}/complete")
    public DepositActionResponse completeQuote(@PathVariable String id) {
        return depositService.completeQuote(id);
    }

    @PostMapping("/quotes/{id}/expire")
    public DepositActionResponse expireQuote(@PathVariable String id) {
        return depositService.expireQuote(id);
    }
}
