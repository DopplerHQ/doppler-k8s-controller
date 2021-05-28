#! /usr/bin/env bash

kubectl delete -f example/deployment.yml
kubectl delete -f example/doppler-secret.yml
kubectl delete secrets/doppler-test-secret
doppler projects delete -y k8s-controller
