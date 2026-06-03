package cerctx

import "context"

type contextKey string

const userKeyKey contextKey = "cerUserKey"

func WithUserKey(ctx context.Context, userKey string) context.Context {
	return context.WithValue(ctx, userKeyKey, userKey)
}

func UserKeyFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	v, _ := ctx.Value(userKeyKey).(string)
	return v
}
