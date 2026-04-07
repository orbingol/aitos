FROM phusion/baseimage:noble-1.0.2 AS base

# Default environment variables
ENV TIKA_VERSION=3.3.0
ENV YQ_VERSION=v4.52.5
ENV YQ_CHECKSUM=75d893a0d5940d1019cb7cdc60001d9e876623852c31cfc6267047bc31149fa9
ENV OLLAMA_VERSION=0.20.2
# Point ollama CLI in the container to the Ollama server running on the host.
ENV OLLAMA_HOST=http://host.docker.internal:11434

# Install dependencies
RUN apt-get update && apt-get install -y \
        ca-certificates \
        openjdk-17-jre-headless \
        poppler-utils \
        jq \
        curl \
        zstd \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install yq
RUN curl -fsSL https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64 -o /usr/local/bin/yq \
    && echo "${YQ_CHECKSUM}  /usr/local/bin/yq" | sha256sum -c - \
    && chmod +x /usr/local/bin/yq

# Install Tika App
RUN curl -fsSL https://archive.apache.org/dist/tika/${TIKA_VERSION}/tika-app-${TIKA_VERSION}.jar -o /usr/local/bin/tika-app.jar \
    && curl -fsSL https://archive.apache.org/dist/tika/${TIKA_VERSION}/tika-app-${TIKA_VERSION}.jar.sha512 -o /tmp/tika-app.jar.sha512 \
    && echo "$(cat /tmp/tika-app.jar.sha512)  /usr/local/bin/tika-app.jar" | sha512sum -c - \
    && rm /tmp/tika-app.jar.sha512 \
    && echo '#!/bin/bash\njava -jar /usr/local/bin/tika-app.jar "$@"' > /usr/local/bin/tika \
    && chmod +x /usr/local/bin/tika

# Install Ollama CLI
RUN curl -fsSL https://github.com/ollama/ollama/releases/download/v${OLLAMA_VERSION}/ollama-linux-amd64.tar.zst -o /tmp/ollama-linux-amd64.tar.zst \
    && curl -fsSL https://github.com/ollama/ollama/releases/download/v${OLLAMA_VERSION}/sha256sum.txt -o /tmp/sha256sum.txt \
    && cd /tmp && grep "ollama-linux-amd64.tar.zst" sha256sum.txt | sha256sum -c - \
    && tar -C /usr/local -xaf /tmp/ollama-linux-amd64.tar.zst \
    && rm /tmp/ollama-linux-amd64.tar.zst /tmp/sha256sum.txt

WORKDIR /app

FROM base AS builder

COPY aitos-builder.sh .
COPY prompts/ ./prompts/
RUN chmod +x aitos-builder.sh

ENTRYPOINT ["/app/aitos-builder.sh"]

FROM base AS analyzer

COPY aitos-analyzer.sh .
COPY prompts/ ./prompts/
RUN chmod +x aitos-analyzer.sh

ENTRYPOINT ["/app/aitos-analyzer.sh"]
