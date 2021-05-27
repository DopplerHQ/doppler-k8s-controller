#!/usr/bin/env bash

# NOTE: The `envsubst` binary is required and can be installed in macOS by running `brew install gettext`

doppler setup
export DOPPLER_TOKEN=$(doppler configs tokens create koppler-k8s-controller-demo --plain)
kubectl apply -f <(SERVICE_TOKEN="$DOPPLER_TOKEN" envsubst < example/dopplersecret.yml)
kubectl apply -f example/deployment.yml
