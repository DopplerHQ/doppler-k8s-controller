const CRD = {
  apiVersion: 'apiextensions.k8s.io/v1',
  kind: 'CustomResourceDefinition',
  metadata: {
    name: 'dopplersecrets.doppler.com'
  },
  spec: {
    group: 'doppler.com',
    versions: [
      {
        name: 'v1',
        served: true,
        storage: true,
        schema: {
          openAPIV3Schema: {
            type: 'object',
            properties: {
              spec: {
                type: 'object',
                properties: {
                  serviceToken: {
                    type: 'string'
                  },
                  secretName: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      }
    ],
    scope: 'Namespaced',
    names: {
      shortNames: ['ds'],
      kind: 'DopplerSecret',
      plural: 'dopplersecrets'
    }
  }
}

interface DopplerSecretManifest {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace: string
  }
  spec: {
    serviceToken: string
    secretName: string
  }
}

interface SecretManifest {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    annotations?: DopplerSecretAnnotations
    labels: {
      dopplerSecret: string
      dopplerSecretName: string
    }
  }
  type: string
  data: Record<string, string>
}

interface DopplerSecretLog {
  id: string
  created: string
}

interface DopplerSecretAnnotations {
  project: string
  environment: string
  config: string
  logId: string
  logCreated: string
}

const createKubeSecret = (
  name: string,
  dopplerSecretName: string,

  secrets: { computed: string },
  annotations: DopplerSecretAnnotations
): SecretManifest => {
  Object.keys(secrets).map((key) => {
    secrets[key] = Buffer.from(secrets[key].computed).toString('base64')
  })

  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name,
      labels: {
        dopplerSecret: 'true',
        dopplerSecretName
      },
      annotations: annotations
    },
    type: 'Opaque',
    data: secrets
  }
}

export {
  CRD,
  DopplerSecretManifest,
  SecretManifest,
  DopplerSecretLog,
  DopplerSecretAnnotations,
  createKubeSecret
}
