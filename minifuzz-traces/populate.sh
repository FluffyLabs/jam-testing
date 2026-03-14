#!/bin/bash
#
# Regenerate minifuzz trace files by running picofuzz in capture mode
# against typeberry (reference implementation).
#
# Prerequisites:
#   - Docker running
#   - picofuzz-stf-data populated (run picofuzz-stf-data/populate.sh first)
#
# Usage:
#   ./minifuzz-traces/populate.sh
#
cd "$(dirname "${BASH_SOURCE[0]}")/.."

set -e

SUITES="fallback safrole storage storage_light"
TRACES_DIR="$(pwd)/minifuzz-traces"
TYPEBERRY_IMAGE="ghcr.io/fluffylabs/typeberry:latest"
STF_DATA="$(pwd)/picofuzz-stf-data/picofuzz-data"

# Check prerequisites
if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker is not running"
  exit 1
fi

if [ ! -d "$STF_DATA/fallback" ]; then
  echo "Error: picofuzz-stf-data not populated. Run picofuzz-stf-data/populate.sh first."
  exit 1
fi

# Get current STF data version for tracking
STF_VERSION=""
if [ -f "picofuzz-stf-data/picofuzz-data/version" ]; then
  STF_VERSION=$(cat picofuzz-stf-data/picofuzz-data/version)
fi
VERSION_FILE="$TRACES_DIR/version"

if [ -f "$VERSION_FILE" ]; then
  CURRENT_VERSION=$(cat "$VERSION_FILE")
  if [ "$CURRENT_VERSION" = "$STF_VERSION" ] && [ -n "$STF_VERSION" ]; then
    echo "Version matches ($STF_VERSION), nothing to do."
    echo "Remove $VERSION_FILE to force regeneration."
    exit 0
  fi
fi

echo "Building picofuzz Docker image..."
npm run build-docker -w @fluffylabs/picofuzz

echo "Pulling typeberry image..."
docker pull --platform=linux/amd64 "$TYPEBERRY_IMAGE"

for suite in $SUITES; do
  echo ""
  echo "========================================"
  echo "  Capturing $suite"
  echo "========================================"

  VOLUME="jam-capture-$suite"
  CONTAINER="typeberry-capture-$suite"
  CAPTURE_DIR="$TRACES_DIR/$suite"

  # Clean previous traces
  rm -rf "$CAPTURE_DIR"

  # Create shared volume
  docker volume rm "$VOLUME" 2>/dev/null || true
  docker volume create "$VOLUME"
  docker run --rm --network none -v "$VOLUME":/shared alpine sh -c "mkdir -p /shared && chmod 777 /shared"

  # Start typeberry
  echo "Starting typeberry..."
  docker run --rm -d \
    --name "$CONTAINER" \
    --network none \
    --memory 512m \
    -v "$VOLUME":/shared \
    "$TYPEBERRY_IMAGE" \
    --version=1 fuzz-target /shared/jam_target.sock

  # Wait for readiness
  echo "Waiting for typeberry..."
  for i in $(seq 1 60); do
    if docker logs "$CONTAINER" 2>&1 | grep -q "PVM Backend"; then
      echo "Typeberry is ready"
      break
    fi
    if [ "$i" -eq 60 ]; then
      echo "Error: Timeout waiting for typeberry"
      docker stop "$CONTAINER" 2>/dev/null || true
      docker volume rm "$VOLUME" 2>/dev/null || true
      exit 1
    fi
    sleep 1
  done

  # Run picofuzz with capture
  echo "Running picofuzz capture..."
  docker run --rm \
    --network none \
    -v "$STF_DATA:/app/picofuzz-stf-data/picofuzz-data:ro" \
    -v "$VOLUME":/shared \
    -v "$CAPTURE_DIR":/app/capture \
    picofuzz \
    --capture=/app/capture \
    "/app/picofuzz-stf-data/picofuzz-data/$suite" \
    /shared/jam_target.sock

  echo "Captured $(ls "$CAPTURE_DIR"/*.bin 2>/dev/null | wc -l | tr -d ' ') files for $suite"

  # Cleanup
  docker stop "$CONTAINER" 2>/dev/null || true
  docker volume rm "$VOLUME" 2>/dev/null || true
done

# Save version
if [ -n "$STF_VERSION" ]; then
  echo "$STF_VERSION" > "$VERSION_FILE"
fi

echo ""
echo "========================================"
echo "  Done. Traces saved to minifuzz-traces/"
echo "========================================"
