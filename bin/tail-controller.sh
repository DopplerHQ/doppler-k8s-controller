#!/usr/bin/env bash

kubectl logs deployments/doppler-controller --namespace doppler-controller --follow --tail 20