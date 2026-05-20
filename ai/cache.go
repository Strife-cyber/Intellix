package ai

import (
	"sync"
	"time"
)

type cacheEntry struct {
	value  string
	expiry time.Time
}

type ResponseCache struct {
	mu       sync.RWMutex
	entries  map[string]cacheEntry
	ttl      time.Duration
	maxSize  int
}

func NewResponseCache(ttl time.Duration, maxSize int) *ResponseCache {
	if ttl <= 0 {
		ttl = 5 * time.Minute
	}
	if maxSize <= 0 {
		maxSize = 200
	}
	return &ResponseCache{
		entries: make(map[string]cacheEntry),
		ttl:     ttl,
		maxSize: maxSize,
	}
}

func (c *ResponseCache) Get(key string) (string, bool) {
	c.mu.RLock()
	entry, ok := c.entries[key]
	c.mu.RUnlock()
	if !ok {
		return "", false
	}
	if time.Now().After(entry.expiry) {
		c.mu.Lock()
		delete(c.entries, key)
		c.mu.Unlock()
		return "", false
	}
	return entry.value, true
}

func (c *ResponseCache) Set(key, value string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.entries) >= c.maxSize {
		for k := range c.entries {
			delete(c.entries, k)
			break
		}
	}

	c.entries[key] = cacheEntry{
		value:  value,
		expiry: time.Now().Add(c.ttl),
	}
}

func (c *ResponseCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries = make(map[string]cacheEntry)
}
