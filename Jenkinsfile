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

                    # Check frontend - retry up to 30 times
                    for i in $(seq 1 30); do
                        # Check if frontend container is healthy via docker inspect
                        running=$(docker inspect aiquran-frontend-1 --format '{{.State.Status}}' 2>/dev/null) || true
                        if [ "$running" = "running" ]; then
                            echo "Frontend container is running (attempt $i)"
                            break
                        fi
                        if [ "$i" -eq 30 ]; then
                            echo "Frontend container did not start"
                            exit 1
                        fi
                        sleep 5
                    done

                    # Check backend
                    for i in $(seq 1 10); do
                        running=$(docker inspect aiquran-backend-1 --format '{{.State.Status}}' 2>/dev/null) || true
                        if [ "$running" = "running" ]; then
                            echo "Backend container is running"
                            exit 0
                        fi
                        sleep 3
                    done
                    echo "Backend container did not start"
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
