FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PORT=8000 \
    PIP_NO_CACHE_DIR=1 \
    PIP_ROOT_USER_ACTION=ignore

WORKDIR /app

# Install minimal OS dependencies for healthchecks and runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv via pip for ultra-fast, standalone package resolution
RUN pip install --no-cache-dir --root-user-action=ignore uv

# Copy dependency specifications first to leverage Docker layer caching
COPY requirements.txt pyproject.toml ./

# Install python dependencies via uv into the system environment
RUN uv pip install --system --no-cache -r requirements.txt

# Create an unprivileged production user and logs directory for security
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser \
    && mkdir -p /app/logs \
    && chown -R appuser:appgroup /app

# Copy backend application code with proper ownership
COPY --chown=appuser:appgroup . .

# Ensure logs directory has read/write permissions for appuser
RUN chmod -R 775 /app/logs

# Switch to non-root user for production security compliance
USER appuser

# Expose backend service port
EXPOSE 8000

# Container healthcheck using dynamic $PORT and dedicated /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Launch FastAPI with shell expansion so $PORT is respected across Render, Cloud Run, AWS, etc.
CMD ["sh", "-c", "exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
