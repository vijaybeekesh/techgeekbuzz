FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /code

# Install OS dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    pkg-config \
    default-libmysqlclient-dev \
    libffi-dev \
    libssl-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    libpng-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (better Docker cache usage)
COPY requirements.txt .

# Upgrade pip and install Python dependencies
RUN pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt
# Copy the application
COPY . .

EXPOSE 8000
CMD ["gunicorn", "tgbwebsite.wsgi:application", "--bind", "0.0.0.0:8000"]