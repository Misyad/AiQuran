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
                    sleep 30

                    # Check frontend
                    for i in $(seq 1 20); do
                        set +e
                        status=$(docker exec "$APP_NAME"-frontend-1 sh -c "wget -q -O- http://localhost:3000 2>/dev/null | head -c 100" 2>/dev/null || echo "")
                        set -e
                        if [ -n "$status" ]; then
                            echo "Frontend is healthy at $APP_URL (attempt $i)"
                            break
                        fi
                        if [ "$i" -eq 20 ]; then
                            echo "Frontend health check failed after 20 attempts"
                            exit 1
                        fi
                        sleep 5
                    done

                    # Check backend
                    for i in $(seq 1 12); do
                        status=$(curl -so /dev/null -w "%{http_code}" http://127.0.0.1:8000/health 2>/dev/null || echo "000")
                        if [ "$status" = "200" ]; then
                            echo "Backend is healthy at $API_URL (attempt $i)"
                            exit 0
                        fi
                        sleep 5
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
