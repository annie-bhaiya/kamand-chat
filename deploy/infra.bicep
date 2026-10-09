param location string = resourceGroup().location
param prefix string = 'pulse-chat'

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'pulse${uniqueString(resourceGroup().id)}'
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: false }
}
resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${prefix}-pull'
  location: location
}
resource pull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, identity.id, 'AcrPull')
  scope: registry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}
resource environment 'Microsoft.App/managedEnvironments@2025-01-01' = {
  name: '${prefix}-env'
  location: location
  properties: {
    workloadProfiles: [{ name: 'Consumption', workloadProfileType: 'Consumption' }]
  }
}
output registryName string = registry.name
output registryHost string = registry.properties.loginServer
output environmentId string = environment.id
output identityId string = identity.id
output apiUrl string = 'https://${prefix}-api.${environment.properties.defaultDomain}'
output webUrl string = 'https://${prefix}-web.${environment.properties.defaultDomain}'
