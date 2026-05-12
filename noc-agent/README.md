# RTEC NOC Agent

Serviço de background (Worker Service) para monitoramento de infraestrutura de clientes da Rtec Tecnologia.
Ele coleta métricas básicas de hardware, identifica melhor a máquina e envia *heartbeats* regulares para a `noc-api`.

## Arquitetura
- Escrito em C# (.NET 8).
- Roda de forma "invisível" como um Serviço do Windows (Windows Service).
- Compilado como um executável portátil único (`win-x64`) contendo todo o runtime necessário embaraçado. Não exige a instalação prévia do .NET Framework no servidor destino.
- Integração nativa com o **BGInfo da Microsoft Sysinternals** para estampar informações como IP e Nome do PC no Papel de Parede.
- Envia versão do agente baseada no assembly, em vez de string hardcoded no código.
- Envia identidade adicional da máquina: `machine_guid`, nome do adaptador de rede e versão do sistema operacional.

## Como Compilar o Agente

A compilação vai embaraçar as DLLs do C# em um único pacote `.exe` de ~60MB.

```ps1
cd d:\PROJETOS\rtec-landing\noc-agent
dotnet publish -c Release
```

O arquivo gerado estará em: `\noc-agent\bin\Release\net8.0\win-x64\publish\noc-agent.exe`.

## Configuração

O arquivo [appsettings.json](/E:/PROJETOS/rtec-landing/noc-agent/appsettings.json) aceita estes campos em `AgentSettings`:

- `ApiBaseUrl`: URL pública da `noc-api`
- `DeviceToken`: token do dispositivo provisionado no tenant
- `DeviceNameOverride`: nome fixo opcional para aparecer no painel
- `EnableBgInfo`: ativa ou desativa o BGInfo
- `HeartbeatTimeoutSeconds`: timeout do POST do heartbeat
- `IntervalSeconds`: intervalo entre heartbeats
- `ServiceName`: nome do serviço Windows

## Como Instalar em um Cliente (Ex: Arruda Serviços)

1. Gere o `publish` do agente.
2. Copie para a máquina do cliente:
   - `noc-agent.exe`
   - `appsettings.json`
   - `install-agent.ps1`
   - `uninstall-agent.ps1`
3. Se `EnableBgInfo=true`, coloque também:
   - `Bginfo.exe`
   - `rtec-bginfo.bgi` opcional
4. Abra o `appsettings.json`.
5. Preencha o `DeviceToken` com o token válido gerado na `noc-api` para o tenant.
6. Ajuste opcionalmente `DeviceNameOverride`, `IntervalSeconds` e `ServiceName`.
7. Abra o **PowerShell como Administrador** e rode:

```ps1
Set-ExecutionPolicy -Scope Process Bypass
.\install-agent.ps1
```

Exemplo com pasta e serviço customizados:

```ps1
.\install-agent.ps1 -InstallPath "C:\Rtec\NOC" -ServiceName "RtecNocAgent-Arruda"
```

O agente agora começará a mandar heartbeat com:
- CPU
- RAM
- disco C
- hostname
- IP local
- MAC
- usuário logado
- uptime
- GUID da máquina
- versão do sistema operacional

Se `EnableBgInfo=true`, ele também tentará desenhar as informações do servidor no papel de parede.

## Remoção

Para remover o agente da máquina do cliente:

```ps1
Set-ExecutionPolicy -Scope Process Bypass
.\uninstall-agent.ps1
```

Para manter os arquivos e remover só o serviço:

```ps1
.\uninstall-agent.ps1 -KeepFiles
```

## Logs de Solução de Problemas
Como ele roda como um Windows Service, qualquer problema de conexão, falhas HTTP ou erros de leitura de hardware ficarão gravados localmente no sistema operacional. Para vê-los, abra o tradicional **Visualizador de Eventos (Event Viewer)** do Windows do cliente e busque na aba "Aplicativo" pela fonte `noc-agent`.

Se o `DeviceToken` estiver vazio, o agente sobe, mas não envia heartbeat até receber um token válido.
