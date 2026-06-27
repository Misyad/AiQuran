pipeline {
    agent any

    environment {
        APP_NAME = "aiquran"
        APP_URL = "http://127.0.0.1:3003"
        API_URL = "http://127.0.0.1:8000"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
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
                        echo "Docker Compose is not installed."
                        exit 1
                    fi

                    docker rm -f "$APP_NAME"-frontend-1 "$APP_NAME"-backend-1 "$APP_NAME"-db-1 "$APP_NAME"-redis-1 "$APP_NAME"-ws-server-1 >/dev/null 2>&1 || true
                    $COMPOSE up -d --build --remove-orphans
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -e
                    echo "Waiting for services to start..."
                    sleep 30

                    # Check frontend via docker exec
                    echo "Checking frontend..."
                    for i in $(seq 1 20); do
                        if docker exec "$APP_NAME"-frontend-1 sh -c "wget -q -O- http://localhost:3000 2>/dev/null | head -c 100" >/dev/null 2>&1; then
                            echo "Frontend healthy at $APP_URL (attempt $i)"
                            break
                        fi
                        if [ "$i" = "20" ]; then
                            echo "Frontend failed after 20 attempts"
                            exit 1
                        fi
                        sleep 5
                    done

                    # Check backend via docker exec
                    echo "Checking backend..."
                    docker cp scripts/health.py "$APP_NAME"-backend-1:/tmp/health.py
                    for i in $(seq 1 12); do
                        set +e
                        docker exec "$APP_NAME"-backend-1 python3 /tmp/health.py >/dev/null 2>&1
                        result=$?
                        set -e
                        if [ "$result" = "0" ]; then
                            echo "Backend healthy at $API_URL (attempt $i)"
                            exit 0
                        fi
                        sleep 5
                    done
                    echo "Backend failed after 12 attempts"
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
