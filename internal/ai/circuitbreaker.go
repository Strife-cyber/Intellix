package ai

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type BreakerState int

const (
	StateClosed   BreakerState = iota
	StateOpen     BreakerState = iota
	StateHalfOpen BreakerState = iota
)

type CircuitBreakerProvider struct {
	inner       Provider
	maxFailures int
	cooldown    time.Duration

	mu            sync.Mutex
	failureCount  int
	state         BreakerState
	lastFailure   time.Time
}

func NewCircuitBreakerProvider(inner Provider, maxFailures int, cooldown time.Duration) *CircuitBreakerProvider {
	if maxFailures <= 0 {
		maxFailures = 3
	}
	if cooldown <= 0 {
		cooldown = 30 * time.Second
	}
	return &CircuitBreakerProvider{
		inner:       inner,
		maxFailures: maxFailures,
		cooldown:    cooldown,
		state:       StateClosed,
	}
}

func (p *CircuitBreakerProvider) Name() string {
	return p.inner.Name() + " (circuit-breaker)"
}

func (p *CircuitBreakerProvider) SwitchModel(model string) {
	p.inner.SwitchModel(model)
}

func (p *CircuitBreakerProvider) ListModels(ctx context.Context) ([]string, error) {
	return p.inner.ListModels(ctx)
}

func (p *CircuitBreakerProvider) Generate(ctx context.Context, prompt string) (string, error) {
	if err := p.allowRequest(); err != nil {
		return "", err
	}

	resp, err := p.inner.Generate(ctx, prompt)
	if err != nil {
		p.recordFailure()
		return "", err
	}

	p.recordSuccess()
	return resp, nil
}

func (p *CircuitBreakerProvider) allowRequest() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	switch p.state {
	case StateClosed:
		return nil
	case StateOpen:
		if time.Since(p.lastFailure) >= p.cooldown {
			p.state = StateHalfOpen
			return nil
		}
		return fmt.Errorf("circuit breaker open for %s (cooldown: %v remaining)",
			p.inner.Name(), p.cooldown-time.Since(p.lastFailure))
	case StateHalfOpen:
		return nil
	default:
		return fmt.Errorf("circuit breaker unknown state")
	}
}

func (p *CircuitBreakerProvider) recordFailure() {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.failureCount++
	p.lastFailure = time.Now()

	if p.state == StateHalfOpen || p.failureCount >= p.maxFailures {
		p.state = StateOpen
	}
}

func (p *CircuitBreakerProvider) recordSuccess() {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.failureCount = 0
	p.state = StateClosed
}
