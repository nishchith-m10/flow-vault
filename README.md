# Import Dashboard

Universal n8n workflow deployment tools - import any JSON workflows with one click.

## Files

| File                 | Description                       |
| -------------------- | --------------------------------- |
| `n8n_deploy_ui.html` | Web UI - drag & drop interface    |
| `n8n_deploy.sh`      | CLI script - command line version |

## Quick Start

### Web UI (Easiest)

```bash
open n8n_deploy_ui.html
```

Then drag-drop your JSON files and click Deploy.

### CLI

```bash
export N8N_API_KEY='your-key'
export N8N_URL='https://your-n8n.com'
./n8n_deploy.sh /path/to/workflows "Tag Name"
```

## Features

- ✅ Import any n8n workflow JSON files
- ✅ Automatic JSON cleaning for API compatibility
- ✅ Optional tagging for organization
- ✅ Works with any n8n instance (cloud or self-hosted)

## Sharing

Zip this folder and send to anyone:

```bash
zip -r import-dashboard.zip import-dashboard/
```
