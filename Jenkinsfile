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

                    # Stop and remove ALL containers from previous builds
                    $COMPOSE down --remove-orphans 2>/dev/null || true
                    docker rm -f aiquran-frontend aiquran-backend aiquran-ws-server aiquran-ws-server-1 aiquran-db aiquran-redis 2>/dev/null || true

                    $COMPOSE up -d --build --remove-orphans
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -e
                    echo "Waiting for services to start..."
                    # Initial wait then loop with retries
                    INITIAL_WAIT=15
                    echo "Initial wait: ${INITIAL_WAIT}s"
                    sleep $INITIAL_WAIT

                    # Check frontend - retry up to 30 times (every 5s = 150s total)
                    for i in $(seq 1 30); do
                        status=$(docker exec aiquran-frontend-1 curl -so /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null) || true
                        if [ "$status" = "200" ] || [ "$status" = "302" ]; then
                            echo "Frontend is healthy at $APP_URL (attempt $i)"
                            break
                        fi
                        if [ "$i" -eq 30 ]; then
                            echo "Frontend did not become healthy after 30 attempts"
                            docker logs aiquran-frontend-1 2>/dev/null | tail -20 || true
                            exit 1
                        fi
                        sleep 5
                    done

                    # Check backend
                    for i in $(seq 1 10); do
                        status=$(docker exec aiquran-backend-1 curl -so /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null) || true
                        if [ "$status" = "200" ]; then
                            echo "Backend is healthy at $API_URL"
                            exit 0
                        fi
                        sleep 3
                    done
                    docker logs aiquran-backend-1 2>/dev/null | tail -20 || true
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
