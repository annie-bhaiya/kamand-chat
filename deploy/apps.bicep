param location string = resourceGroup().location
param prefix string = 'kamand-chat'
param environmentId string
param identityId string
param registryHost string
param imageTag string
param apiUrl string
param webUrl string
param clientOrigins string = webUrl
param authEmailRedirectUrl string = 'https://kamandchat.highliftpages.com'
param webCustomDomains array = []
param supabaseUrl string
@secure()
param supabaseKey string

resource api 'Microsoft.App/containerApps@2025-01-01' = {
  name: '${prefix}-api'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identityId}': {} }
  }
  properties: {
    managedEnvironmentId: environmentId
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: true, targetPort: 4000, transport: 'auto', allowInsecure: false }
      registries: [{ server: registryHost, identity: identityId }]
      secrets: [{ name: 'supabase-key', value: supabaseKey }]
    }
    template: {
      containers: [{
        name: 'api'
        image: '${registryHost}/pulse-api:${imageTag}'
        resources: { cpu: json('0.5'), memory: '1Gi' }
        env: [
          { name: 'NODE_ENV', value: 'production' }
          { name: 'HOST', value: '0.0.0.0' }
          { name: 'PORT', value: '4000' }
          { name: 'TRUST_PROXY', value: '1' }
          { name: 'CLIENT_ORIGINS', value: clientOrigins }
          { name: 'AUTH_EMAIL_REDIRECT_URL', value: authEmailRedirectUrl }
          { name: 'SUPABASE_URL', value: supabaseUrl }
          { name: 'SUPABASE_PUBLISHABLE_KEY', secretRef: 'supabase-key' }
        ]
        probes: [
          { type: 'Startup', httpGet: { path: '/health', port: 4000 }, periodSeconds: 5, failureThreshold: 30 }
          { type: 'Liveness', httpGet: { path: '/health', port: 4000 }, periodSeconds: 30, failureThreshold: 3 }
          { type: 'Readiness', httpGet: { path: '/ready', port: 4000 }, periodSeconds: 10, failureThreshold: 3 }
        ]
      }]
      // Keep realtime fan-out and the process-local rate limiter on one instance.
      scale: { minReplicas: 1, maxReplicas: 1 }
    }
  }
}
resource web 'Microsoft.App/containerApps@2025-01-01' = {
  name: '${prefix}-web'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identityId}': {} }
  }
  properties: {
    managedEnvironmentId: environmentId
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: true, targetPort: 3000, transport: 'auto', allowInsecure: false, customDomains: webCustomDomains }
      registries: [{ server: registryHost, identity: identityId }]
    }
    template: {
      containers: [{
        name: 'web'
        image: '${registryHost}/pulse-web:${imageTag}'
        resources: { cpu: json('0.5'), memory: '1Gi' }
        env: [
          { name: 'NODE_ENV', value: 'production' }
          { name: 'HOSTNAME', value: '0.0.0.0' }
          { name: 'PORT', value: '3000' }
        ]
        probes: [
          { type: 'Startup', httpGet: { path: '/', port: 3000 }, periodSeconds: 5, failureThreshold: 30 }
          { type: 'Liveness', httpGet: { path: '/', port: 3000 }, periodSeconds: 30, failureThreshold: 3 }
          { type: 'Readiness', httpGet: { path: '/', port: 3000 }, periodSeconds: 10, failureThreshold: 3 }
        ]
      }]
      scale: { minReplicas: 0, maxReplicas: 2, rules: [{ name: 'http', http: { metadata: { concurrentRequests: '50' } } }] }
    }
  }
}
output apiUrl string = apiUrl
output webUrl string = 'https://${web.properties.configuration.ingress.fqdn}'
