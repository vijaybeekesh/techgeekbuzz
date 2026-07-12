# Use official Python base image
FROM python:3.12-slim
# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# Set work directory
WORKDIR /code
# Install system dependencies for mysqlclient
RUN apt-get update && apt-get install -y \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    gcc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt
RUN apt-get update
# Copy code files
COPY . /code
# Expose port 8000 for the application
EXPOSE 8000
# Entrypoint is overwritten by docker-compose commands
CMD ["gunicorn", "tgbwebsite.wsgi:application"]