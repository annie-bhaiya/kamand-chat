# Kamand Chat custom domain

Requested public URL: **https://kamandchat.highliftpages.com**.

Keep the existing Squarespace nameservers. In the `highliftpages.com` zone, add these custom records:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| CNAME | `kamandchat` | `kamand-chat-web.blackmeadow-4b6b3a7d.centralindia.azurecontainerapps.io` | Default |
| TXT | `asuid.kamandchat` | `02254386A665CAB2C6B7ED581E5DB5E9C59E983C815177BFEA84F5630117AEA6` | Default |

These values were read from the new standard Container Apps environment. The previous Express environment does not support custom domain bindings. Do not point this CNAME to the previous `pulse-chat-web` hostname.

Once both records resolve publicly, add the domain and bind an Azure managed HTTPS certificate:

```powershell
az containerapp hostname add -g rg-pulse-chat -n kamand-chat-web --hostname kamandchat.highliftpages.com
az containerapp hostname bind -g rg-pulse-chat -n kamand-chat-web --hostname kamandchat.highliftpages.com --environment kamand-chat-env --validation-method CNAME
```

Certificate issuance can take several minutes. The CNAME must point directly to the Azure hostname. If the root domain has restrictive CAA records, allow DigiCert with `0 issue digicert.com`. [Azure custom domain and certificate requirements](https://learn.microsoft.com/en-us/azure/container-apps/custom-domains-managed-certificates).

The backend CORS configuration accepts the requested custom origin and the generated Azure frontend origin. The deployment script preserves existing custom-domain bindings during redeployment. Verify frontend HTTP 200, browser HTTPS and API/WebSocket connectivity after certificate binding.
