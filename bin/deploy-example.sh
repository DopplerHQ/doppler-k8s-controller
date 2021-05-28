#!/usr/bin/env bash

set -e

# NOTE: The `envsubst` binary is required and can be installed in macOS by running `brew install gettext`

echo -e '\n[info]: check controller has been deployed\n'
kubectl apply -f doppler-crd-controller.yml
kubectl rollout status -w deployment/doppler-controller --namespace doppler-controller
sleep 3

echo -e '\n[info]: create example Doppler project\n'
doppler projects create k8s-controller
doppler setup --project k8s-controller --config dev
doppler secrets set API_KEY=123
doppler secrets set AUTH_TOKEN=abc
sleep 3

echo -e '\n[info]: generate Doppler service token\n'
export DOPPLER_TOKEN=$(doppler configs tokens create doppler-k8s --plain)
sleep 5

echo -e '\n[info]: create DopplerSecret from example/doppler-secret.yml\n'
kubectl apply -f <(SERVICE_TOKEN="$DOPPLER_TOKEN" envsubst < example/doppler-secret.yml)
sleep 2

echo -e '\n[info]: confirm associated Kubernetes secret created'
sleep 4
./bin/get-secret.sh doppler-test-secret
 
echo -e '\n[info]: create Deployment from example/deployment.yml\n'
kubectl apply -f example/deployment.yml
kubectl rollout status -w deployment/doppler-test-deployment
sleep 3

echo -e '\n[info]: confirm container environment variables set from secret'
./bin/pod-logs.sh app=doppler-test
sleep 1

echo -e '\n[info]: done!\n'
