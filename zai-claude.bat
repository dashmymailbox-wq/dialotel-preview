@echo off
title Claude Code z.ai GLM-5.1
powershell -Command "$env:ANTHROPIC_BASE_URL='https://api.z.ai/api/anthropic'; $env:ANTHROPIC_AUTH_TOKEN='4010de0830e346a998e30236d6da6c92.tyh5CVrEXH4EvFY2'; claude --model glm-5.1"