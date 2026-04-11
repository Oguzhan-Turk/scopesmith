pipeline {
  agent any

  options {
    ansiColor('xterm')
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  parameters {
    booleanParam(name: 'RUN_SMOKE', defaultValue: true, description: 'Run Playwright smoke tests')
    booleanParam(name: 'DEPLOY_TO_OPENSHIFT', defaultValue: false, description: 'Deploy to OpenShift after verify')
    string(name: 'OPENSHIFT_NAMESPACE', defaultValue: 'scopesmith-dev', description: 'Target OpenShift namespace')
    string(name: 'BACKEND_IMAGE', defaultValue: '', description: 'Optional backend image (e.g. registry/org/scopesmith-backend:tag)')
    string(name: 'FRONTEND_IMAGE', defaultValue: '', description: 'Optional frontend image (e.g. registry/org/scopesmith-frontend:tag)')
  }

  environment {
    DB_URL = 'jdbc:postgresql://localhost:5432/scopesmith'
    DB_USERNAME = 'scopesmith'
    DB_PASSWORD = 'scopesmith_dev'
    ANTHROPIC_API_KEY = 'dummy'
    OPENAI_API_KEY = 'dummy'
    SMOKE_CLEANUP = 'true'
    SMOKE_BASE_URL = 'http://localhost:5173'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Prepare') {
      steps {
        sh '''
          java -version
          node -v
          npm -v
        '''
      }
    }

    stage('Backend Tests') {
      steps {
        dir('backend') {
          sh './mvnw test'
        }
      }
    }

    stage('Frontend Verify') {
      steps {
        dir('frontend') {
          sh '''
            npm ci
            npm run lint
            npm run build
            npm run e2e:install
          '''
        }
      }
    }

    stage('E2E Smoke') {
      when {
        expression { return params.RUN_SMOKE }
      }
      steps {
        sh '''
          cd backend
          nohup ./mvnw spring-boot:run > ../backend.log 2>&1 &
          cd ..
          for i in $(seq 1 60); do
            if curl -fsS http://localhost:8080/actuator/health >/dev/null; then
              echo "Backend is ready"
              break
            fi
            sleep 2
            if [ "$i" -eq 60 ]; then
              echo "Backend failed to start"
              cat backend.log || true
              exit 1
            fi
          done
          cd frontend
          npm run e2e:smoke
        '''
      }
    }

    stage('Deploy OpenShift') {
      when {
        allOf {
          branch 'main'
          expression { return params.DEPLOY_TO_OPENSHIFT }
        }
      }
      steps {
        withCredentials([
          string(credentialsId: 'openshift-token', variable: 'OPENSHIFT_TOKEN'),
          string(credentialsId: 'scopesmith-encryption-key', variable: 'SCOPESMITH_ENCRYPTION_KEY')
        ]) {
          sh '''
            if [ -z "$SCOPESMITH_ENCRYPTION_KEY" ]; then
              echo "ERROR: SCOPESMITH_ENCRYPTION_KEY is required for deploy."
              exit 1
            fi
            if [ "$SCOPESMITH_ENCRYPTION_KEY" = "scopesmith-default-key-change-in-production" ]; then
              echo "ERROR: Default encryption key is not allowed for deploy."
              exit 1
            fi

            oc login --token="$OPENSHIFT_TOKEN" --server="$OPENSHIFT_API_URL"
            oc project "$OPENSHIFT_NAMESPACE"

            # Avoid leaking secret values in shell trace
            set +x
            oc set env deployment/scopesmith-backend SCOPESMITH_ENCRYPTION_KEY="$SCOPESMITH_ENCRYPTION_KEY" -n "$OPENSHIFT_NAMESPACE"
            set -x

            if [ -d deploy/openshift ]; then
              oc apply -f deploy/openshift/
            fi

            if [ -n "$BACKEND_IMAGE" ]; then
              oc set image deployment/scopesmith-backend scopesmith-backend="$BACKEND_IMAGE" -n "$OPENSHIFT_NAMESPACE"
            fi

            if [ -n "$FRONTEND_IMAGE" ]; then
              oc set image deployment/scopesmith-frontend scopesmith-frontend="$FRONTEND_IMAGE" -n "$OPENSHIFT_NAMESPACE"
            fi

            oc rollout status deployment/scopesmith-backend -n "$OPENSHIFT_NAMESPACE" --timeout=180s || true
            oc rollout status deployment/scopesmith-frontend -n "$OPENSHIFT_NAMESPACE" --timeout=180s || true
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'backend.log,frontend/playwright-report/**,frontend/test-results/**', allowEmptyArchive: true
      sh 'pkill -f "spring-boot:run" || true'
    }
  }
}
