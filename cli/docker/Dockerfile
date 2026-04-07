FROM phusion/baseimage:noble-1.0.2

# Default environment variables
ENV TIKA_VERSION=3.2.3
ENV YQ_VERSION=v4.50.1
ENV YQ_CHECKSUM=c7a1278e6bbc4924f41b56db838086c39d13ee25dcb22089e7fbf16ac901f0d4
ENV OLLAMA_VERSION=0.20.2
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

# Set up application directory
WORKDIR /app

# Copy the script and prompts
COPY aitos-analyzer.sh .
COPY prompts/ ./prompts/
RUN chmod +x aitos-analyzer.sh

# Define entrypoint to allow passing arguments to shell script
ENTRYPOINT ["/app/aitos-analyzer.sh"]
