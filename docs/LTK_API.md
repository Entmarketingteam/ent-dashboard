# LTK API Endpoints

All requests require: `Authorization: Bearer {access_token}`
All are server-side only (401 from browser due to CORS).

## Gateway URLs
- Primary: `https://api-gateway.rewardstyle.com` (referred to as GATEWAY below)
- Creator: `https://creator-api-gateway.shopltk.com/v1` (referred to as CREATOR below)

## Endpoints

### Hero Chart (PRIMARY — daily performance breakdown)
```
GET {GATEWAY}/analytics/hero_chart?range={range}&publisher_id={pid}
```
range: last_2_days | last_7_days | last_30_days | this_month | custom (+ start/end as YYYY-MM-DD)

### Analytics Summary
```
GET {CREATOR}/analytics/summary?range={range}
```
Returns: post_impressions, posts_count

### Followers
```
GET {CREATOR}/community/followers?range={range}
```
Returns: followers_total, net_change

### Earnings
```
GET {CREATOR}/earnings/summary?range={range}
```
Returns: commissions, pending_payment, currency

### Engagement
```
GET {CREATOR}/engagement/summary?range={range}
```
Returns: total_visits, product_clicks, orders, items_sold, total_sales, returns

### Performance Summary
```
GET {GATEWAY}/api/creator-analytics/v1/performance_summary?range={range}&publisher_id={pid}
```

### Commissions
```
GET {GATEWAY}/api/creator-analytics/v1/commissions_summary?range={range}&publisher_id={pid}
```

### Top Products (paginated)
```
GET {GATEWAY}/analytics/top_performers/links?range={range}&publisher_id={pid}&page={n}&per_page=10
```
~1,947 products / ~195 pages for Nicki. Add 200ms delay between pages.

### Contributors
```
GET {GATEWAY}/analytics/contributors?publisher_id={pid}
```

### Profile
```
GET {GATEWAY}/api/pub/v2/profiles/{profile_id}
```

### Amazon Tags
```
GET {GATEWAY}/api/co-api/v1/get_amazon_identities?publisher_id={pid}
```

## Rate Limits
Token refresh: ~10/min. Analytics: ~100/hr. Paginated: no known limit but add delays.
