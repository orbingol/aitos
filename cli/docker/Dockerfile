FROM phusion/baseimage:noble-1.0.2

# Default environment variables
ENV TIKA_VERSION=3.2.3
ENV YQ_VERSION=v4.44.1
ENV OLLAMA_HOST=http://host.docker.internal:11434

# Install dependencies
RUN apt-get update && apt-get install -y \
        openjdk-17-jre-headless \
        poppler-utils \
        jq \
        curl \
        zstd \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install yq
RUN curl -fsSL https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64 -o /usr/local/bin/yq && \
    chmod +x /usr/local/bin/yq

# Install Tika App
RUN curl -fsSL https://archive.apache.org/dist/tika/${TIKA_VERSION}/tika-app-${TIKA_VERSION}.jar -o /usr/local/bin/tika-app.jar \
    && echo '#!/bin/bash\njava -jar /usr/local/bin/tika-app.jar "$@"' > /usr/local/bin/tika \
    && chmod +x /usr/local/bin/tika

# Install Ollama CLI
RUN curl -fsSL https://ollama.com/install.sh -o /tmp/ollama-install.sh \
    && sh /tmp/ollama-install.sh \
    && rm /tmp/ollama-install.sh

# Set up application directory
WORKDIR /app

# Copy the script and prompts
COPY aitos.sh .
COPY prompts/ ./prompts/
RUN chmod +x aitos.sh

# Define entrypoint to allow passing arguments to shell script
ENTRYPOINT ["/app/aitos.sh"]
