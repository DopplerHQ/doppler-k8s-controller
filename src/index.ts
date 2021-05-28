import axios from 'axios'
import { Client1_13 } from 'kubernetes-client'
import {
  CRD,
  DopplerSecretManifest,
  SecretManifest,
  DopplerSecretLog,
  DopplerSecretAnnotations,
  createKubeSecret
} from './crd'

const client = new Client1_13({})
client.addCustomResourceDefinition(CRD)

const SYNC_INTERVAL = Number(process.env.SYNC_INTERVAL || 5000)

const triggerDeployment = async (
  deployment: string,
  namespace: string,
  secret: SecretManifest
) => {
  const annotations = {
    'dopplersecrets.doppler.com/secretsupdate': `${secret.metadata.annotations.project}-${secret.metadata.annotations.config}-${secret.metadata.annotations.logId}`
  }
  await client.apis.apps.v1
    .namespaces(namespace)
    .deployments(deployment)
    .patch({
      body: {
        metadata: {
          annotations
        },
        spec: {
          template: {
            metadata: {
              annotations
            }
          }
        }
      }
    })
}

const checkDeployments = async (
  dopplerSecret: DopplerSecretManifest,
  secret: SecretManifest
) => {
  console.log(
    `[info]:  checking for reloadable deployments using secret '${dopplerSecret.spec.secretName}'`
  )
  const deployments = await client.apis.apps.v1
    .namespaces(dopplerSecret.metadata.namespace)
    .deployments.get()
  deployments.body.items.forEach((deployment) => {
    const dopplerReload = Boolean(
      deployment.metadata.annotations['dopplersecrets.doppler.com/reload']
    )

    if (dopplerReload) {
      console.log(
        `[info]:  reloadable deployment (${deployment.metadata.name}) found - checking for updated secrets`
      )
      // Check containers
      deployment.spec.template.spec.containers.forEach((container) => {
        container.envFrom.forEach(async (envFrom) => {
          if (envFrom.secretRef?.name === dopplerSecret.spec.secretName) {
            console.log(
              `[info]:  updated secret (${dopplerSecret.spec.secretName}) found in ${container.name}`
            )
            console.log(
              `[info]:  triggering redeploy for ${deployment.metadata.name}`
            )
            triggerDeployment(
              deployment.metadata.name,
              deployment.metadata.namespace,
              secret
            )
          }
        })
      })
    }
  })
}

const upsertKubeSecret = async (
  dopplerSecret,
  dopplerSecretLog: DopplerSecretLog
): Promise<void> => {
  const { data: secretData } = await axios({
    url: 'https://api.doppler.com/v3/configs/config/secrets',
    headers: {
      'api-key': dopplerSecret.spec.serviceToken
    }
  })

  let secretUpdated = false

  const annotations: DopplerSecretAnnotations = {
    project: secretData.secrets.DOPPLER_PROJECT.computed,
    environment: secretData.secrets.DOPPLER_ENVIRONMENT.computed,
    config: secretData.secrets.DOPPLER_CONFIG.computed,
    logId: dopplerSecretLog.id,
    logCreated: dopplerSecretLog.created
  }

  console.log(
    `[info]:  secrets fetched for ${annotations.project} => ${annotations.config}`
  )

  const kubeSecret: SecretManifest = createKubeSecret(
    dopplerSecret.spec.secretName,
    dopplerSecret.metadata.name,
    secretData.secrets,
    annotations
  )

  try {
    // If this fails, secret doesn't exist yet so catch will create the secret
    const existingSecret = await client.api.v1
      .namespaces(dopplerSecret.metadata.namespace)
      .secrets(dopplerSecret.spec.secretName)
      .get()

    if (annotations.logId === existingSecret.body.metadata.annotations?.logId) {
      console.log(`[info]:  secret ${kubeSecret.metadata.name} unchanged`)
      return
    }

    console.log(`[info]:  updated secret ${kubeSecret.metadata.name}`)

    await client.api.v1
      .namespaces(dopplerSecret.metadata.namespace)
      .secrets(dopplerSecret.spec.secretName)
      .put({ body: kubeSecret })
    secretUpdated = true
    console.log(
      `[info]:  secret log ID changed from ${existingSecret.body.metadata.annotations.logId} to ${annotations.logId}`
    )
  } catch (e) {
    // Secret didn't exist so create
    await client.api.v1
      .namespaces(dopplerSecret.metadata.namespace)
      .secrets.post({ body: kubeSecret })
    console.log(`[info]:  secret ${dopplerSecret.spec.secretName} created`)
    secretUpdated = true
  }

  if (secretUpdated) {
    checkDeployments(dopplerSecret, kubeSecret)
  }
}

const secretsSync = async () => {
  console.log('\n[info]:  secrets sync initialized\n')

  const namespaces = await client.api.v1.namespaces.get()

  // Iterate through every namespace to find DopplerSecrets
  namespaces.body.items.forEach(async (namespace) => {
    const dopplerSecrets = (await (
      await client.apis[CRD.spec.group].v1
        .namespaces(namespace.metadata.name)
        .dopplersecrets.get()
    ).body.items.filter(
      (x) => x.kind === CRD.spec.names.kind
    )) as DopplerSecretManifest[]

    if (dopplerSecrets.length === 0) {
      return
    }

    console.log(
      `[info]:  starting sync in namespace '${namespace.metadata.name}' - ${dopplerSecrets.length} secrets found\n`
    )

    // Iterate through every DopplerSecret in namespace
    dopplerSecrets.forEach(async (dopplerSecret) => {
      console.log(
        `[info]:  performing sync check for ${dopplerSecret.metadata.name}`
      )

      try {
        // Fetch log data as a verification step to ensure service token still valid
        const { data: logData } = await axios({
          url: 'https://api.doppler.com/v3/configs/config/logs',
          headers: {
            'api-key': dopplerSecret.spec.serviceToken
          }
        })

        const latestSecretLog: DopplerSecretLog = {
          id: logData.logs[0].id,
          created: logData.logs[0].created_at
        }
        upsertKubeSecret(dopplerSecret, latestSecretLog)
      } catch (error) {
        console.log(
          `[error]: failed to fetch secrets for ${dopplerSecret.metadata.name}: ${error.response.data.messages}`
        )
      }
    })
  })
}

secretsSync()
setInterval(secretsSync, SYNC_INTERVAL)
