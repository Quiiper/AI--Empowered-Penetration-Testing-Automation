# Use an official Node.js runtime as the base image
FROM node:20-slim AS frontend-builder

# Set working directory
WORKDIR /app

# Install gotty
RUN apt-get update && apt-get install -y wget && \
    wget https://github.com/yudai/gotty/releases/download/v1.0.1/gotty_linux_amd64.tar.gz && \
    tar -xzf gotty_linux_amd64.tar.gz && \
    mv gotty /usr/local/bin/ && \
    rm gotty_linux_amd64.tar.gz

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build the React application
RUN npm run build

# Production stage
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    apt-utils \
    curl \
    wget \
    7z \
    build-essential \
    python3-dev \
    gnupg2 \
    git \
    ruby \
    ruby-dev \
    bundler \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && echo "deb http://http.kali.org/kali kali-rolling main contrib non-free" > /etc/apt/sources.list.d/kali.list \
    && wget -q -O /etc/apt/trusted.gpg.d/kali-archive-keyring.gpg https://archive.kali.org/archive-keyring.gpg \
    && apt-get update \
    && apt-get install -y \
    nodejs \
    nmap \
    dnsrecon \
    john \
    john-data \
    hashcat \
    hydra \
    sqlmap \
    gobuster \
    dirb \
    netexec \
    netcat-traditional \
    aircrack-ng \
    tshark \
    tcpdump \
    ssh-audit \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Install Metasploit Framework using official installer
RUN curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > msfinstall && \
    chmod 755 msfinstall && \
    ./msfinstall && \
    ln -s /opt/metasploit-framework/bin/msfconsole /usr/local/bin/msfconsole && \
    ln -s /opt/metasploit-framework/bin/msfvenom /usr/local/bin/msfvenom && \
    ln -s /opt/metasploit-framework/bin/msfdb /usr/local/bin/msfdb && \
    ln -s /opt/metasploit-framework/bin/msfrpcd /usr/local/bin/msfrpcd && \
    ln -s /opt/metasploit-framework/bin/msfupdate /usr/local/bin/msfupdate && \
    echo 'export PATH=$PATH:/opt/metasploit-framework/bin' >> /etc/profile && \
    echo 'export PATH=$PATH:/opt/metasploit-framework/bin' >> /root/.bashrc

# Install ExploitDB from GitLab
RUN cd /opt && \
    git clone https://gitlab.com/exploit-database/exploitdb.git && \
    ln -s /opt/exploitdb/searchsploit /usr/local/bin/ && \
    echo 'export PATH=$PATH:/opt/exploitdb' >> /etc/profile && \
    echo 'export PATH=$PATH:/opt/exploitdb' >> /root/.bashrc

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir impacket
RUN pip install --no-cache-dir certipy-ad
RUN pip install --no-cache-dir bloodyAD

# Set working directory
WORKDIR /app

# Copy built files from frontend-builder stage
COPY --from=frontend-builder /app/dist ./dist
COPY --from=frontend-builder /app/app.py .
COPY --from=frontend-builder /app/templates ./templates
COPY --from=frontend-builder /app/static ./static
COPY --from=frontend-builder /app/mistral-7b-instruct-v0.1.Q5_K_M.gguf .

# Create directory for database
RUN mkdir -p /app/data && \
    touch /app/data/chat.db && \
    chmod 666 /app/data/chat.db

# Copy EnumRunner directory and make it available system-wide
COPY EnumRunner /usr/local/bin/EnumRunner
RUN chmod +x /usr/local/bin/EnumRunner/EnumRunner.sh && \
    ln -s /usr/local/bin/EnumRunner/EnumRunner.sh /usr/local/bin/enumrunner

# Copy gotty from frontend-builder
COPY --from=frontend-builder /usr/local/bin/gotty /usr/local/bin/

# Expose ports
EXPOSE 5000 4444

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV DATABASE_PATH=/app/data/chat.db
ENV PATH=$PATH:/opt/metasploit-framework/bin:/opt/exploitdb
ENV TERM=xterm

# Start both the Flask app and gotty
CMD gotty -w -p 4444 bash & python app.py
