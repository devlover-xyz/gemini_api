# Production Deployment Guide

## Docker Deployment

### Quick Start

1. **Build and run with Docker Compose:**
```bash
docker-compose up -d
```

2. **View logs:**
```bash
docker-compose logs -f
```

3. **Stop:**
```bash
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t scraping-api .

# Run container
docker run -d \
  --name scraping-api \
  -p 3000:3000 \
  -e HEADLESS=true \
  -e BROWSER_POOL_SIZE=5 \
  -e MAX_CONCURRENT_REQUESTS=3 \
  --shm-size=2gb \
  scraping-api
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | production | Environment |
| `HEADLESS` | true | Run browser in headless mode |
| `BROWSER_POOL_SIZE` | 5 | Maximum number of browser instances |
| `BROWSER_MAX_IDLE_TIME` | 300000 | Browser idle timeout (ms) |
| `MAX_CONCURRENT_REQUESTS` | 3 | Max concurrent scraping requests |
| `REQUESTS_PER_MINUTE` | 60 | Rate limit per minute |

## Production Optimizations Implemented

### 1. Resource Management

- **Browser Pool**: Reuses browser instances across requests
- **Memory Limits**: Blocks unnecessary resources (images, CSS, fonts)
- **Auto Cleanup**: Closes idle browsers after timeout
- **Graceful Shutdown**: Properly closes all browsers on shutdown

### 2. Error Handling

- **Retry Mechanism**: Auto-retry failed requests (configurable)
- **Timeout Protection**: Multiple timeout layers to prevent hanging
- **Force Cleanup**: SIGKILL browser processes if graceful close fails
- **Error Recovery**: Each scraper instance is isolated

### 3. Request Management

- **Request Queue**: Queue system to prevent overload
- **Rate Limiting**: Configurable requests per minute
- **Concurrent Limiting**: Max concurrent scraping operations
- **Queue Metrics**: Monitor queue length and processing

### 4. Monitoring

- **Health Endpoint**: `/health` - System health and uptime
- **Metrics Endpoint**: `/api/metrics` - Detailed performance metrics
- **Resource Monitoring**: Memory, CPU, browser pool stats
- **Request Stats**: Queue length, rate limit usage

### 5. Docker Optimizations

- **Shared Memory**: 2GB shm_size for Chrome stability
- **Memory Limits**: 2GB container memory limit
- **CPU Limits**: 2 CPU cores
- **Security**: Non-root user, minimal capabilities
- **Health Checks**: Built-in Docker health monitoring

## Scaling Strategies

### Horizontal Scaling

Deploy multiple instances behind a load balancer:

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  scraping-api:
    # ... configuration
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

Run:
```bash
docker-compose -f docker-compose.scale.yml up --scale scraping-api=3
```

### Vertical Scaling

Adjust resource limits based on load:

```bash
# For heavy load
docker run -d \
  --cpus=4 \
  --memory=4g \
  --shm-size=4gb \
  -e BROWSER_POOL_SIZE=10 \
  -e MAX_CONCURRENT_REQUESTS=5 \
  scraping-api
```

## Performance Tuning

### For High Volume (1000+ requests/hour)

```env
BROWSER_POOL_SIZE=10
MAX_CONCURRENT_REQUESTS=5
REQUESTS_PER_MINUTE=100
BROWSER_MAX_IDLE_TIME=600000
```

### For Memory-Constrained Environments

```env
BROWSER_POOL_SIZE=2
MAX_CONCURRENT_REQUESTS=2
REQUESTS_PER_MINUTE=30
BROWSER_MAX_IDLE_TIME=120000
```

### For Low Latency

```env
BROWSER_POOL_SIZE=5
MAX_CONCURRENT_REQUESTS=3
REQUESTS_PER_MINUTE=60
BROWSER_MAX_IDLE_TIME=300000
```

## Monitoring Best Practices

1. **Monitor Health Endpoint**:
```bash
curl http://localhost:3000/health
```

2. **Check Metrics**:
```bash
curl http://localhost:3000/api/metrics
```

3. **Watch Logs**:
```bash
docker logs -f scraping-api
```

4. **Monitor Key Metrics**:
   - Browser pool utilization
   - Request queue length
   - Memory usage
   - Request success rate

## Troubleshooting

### High Memory Usage

- Reduce `BROWSER_POOL_SIZE`
- Reduce `MAX_CONCURRENT_REQUESTS`
- Check for memory leaks with `/api/metrics`
- Restart container periodically

### Timeout Errors

- Increase timeout in scraper config
- Check network connectivity
- Verify target website is accessible
- Review retry mechanism

### Browser Launch Failures

- Ensure `--shm-size` is set (minimum 1GB)
- Check available memory
- Verify Chrome dependencies are installed
- Check container logs for errors

### Queue Buildup

- Increase `MAX_CONCURRENT_REQUESTS`
- Add more instances (horizontal scaling)
- Check scraper performance
- Review rate limiting settings

## Security Considerations

1. **Container runs as non-root user**
2. **Minimal Linux capabilities**
3. **No privileged mode**
4. **CORS configured** (update for production)
5. **No sensitive data in logs**

## Recommended Production Setup

```yaml
services:
  scraping-api:
    image: scraping-api:latest
    restart: unless-stopped
    environment:
      NODE_ENV: production
      BROWSER_POOL_SIZE: 5
      MAX_CONCURRENT_REQUESTS: 3
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    healthcheck:
      interval: 30s
      timeout: 10s
      retries: 3
```

## Load Balancer Configuration

Example Nginx configuration:

```nginx
upstream scraping_backend {
    least_conn;
    server scraping-api-1:3000;
    server scraping-api-2:3000;
    server scraping-api-3:3000;
}

server {
    listen 80;

    location / {
        proxy_pass http://scraping_backend;
        proxy_timeout 90s;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

## Metrics to Monitor

- **Response Time**: Track P50, P95, P99 latencies
- **Error Rate**: Failed requests / total requests
- **Browser Pool**: Utilization percentage
- **Queue Depth**: Number of pending requests
- **Memory**: RSS and heap usage trends
- **CPU**: Usage percentage
- **Success Rate**: Successful scrapes / total attempts
