pipeline {
    agent any

    environment {
        APP_NAME = "aiquran"
        APP_URL = "http://127.0.0.1:3000"
        API_URL = "http://127.0.0.1:8000"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Prepare Quran Data') {
            steps {
                sh '''
                    mkdir -p frontend/src/lib/quran
                    if [ ! -f frontend/src/lib/quran/quran_id.json ]; then
                        echo "Downloading Quran data..."
                        curl -sL -o frontend/src/lib/quran/quran_id.json \
                          "https://raw.githubusercontent.com/sutanlab/quran-api/master/data/quran.json?download=quran_id.json" \
                          -H "Accept: application/json" 2>/dev/null || echo "Will try alternative download"
                    fi
                    if [ ! -f frontend/src/lib/quran/quran_id.json ]; then
                        echo "ERROR: Quran data file not found!"
                        exit 1
                    fi
                    echo "Quran data ready: $(wc -c < frontend/src/lib/quran/quran_id.json) bytes"
                '''
            }
        }

        stage('Build and Deploy') {
            steps {
                sh '''
                    set -e

                    if docker compose version >/dev/null 2>&1; then
                        COMPOSE="docker compose"
                    elif command -v docker-compose >/dev/null 2>&1; then
                        COMPOSE="docker-compose"
                    else
                        echo "Docker Compose is not installed on this Jenkins server."
                        exit 1
                    fi

                    docker rm -f "$APP_NAME"-frontend "$APP_NAME"-backend "$APP_NAME"-db "$APP_NAME"-redis >/dev/null 2>&1 || true
                    $COMPOSE up -d --build --remove-orphans
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -e
                    echo "Waiting for services to start..."
                    sleep 10

                    # Check frontend
                    for i in $(seq 1 20); do
                        status=$(curl -so /dev/null -w "%{http_code}" http://127.0.0.1:3000)
                        if [ "$status" = "200" ] || [ "$status" = "302" ]; then
                            echo "Frontend is healthy at $APP_URL"
                            break
                        fi
                        if [ "$i" -eq 20 ]; then
                            echo "Frontend did not become healthy"
                            exit 1
                        fi
                        sleep 5
                    done

                    # Check backend
                    for i in $(seq 1 10); do
                        status=$(curl -so /dev/null -w "%{http_code}" http://127.0.0.1:8000/health 2>/dev/null)
                        if [ "$status" = "200" ]; then
                            echo "Backend is healthy at $API_URL"
                            exit 0
                        fi
                        sleep 3
                    done
                    echo "Backend health check failed"
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo "AiQuran deployment success!"
        }
        failure {
            echo "AiQuran deployment failed. Check Jenkins logs."
        }
    }
}
