# 🚀 NexusTrack — Plataforma de Tracking, Atribuição UTM & Meta Ads Manager

O **NexusTrack** é uma plataforma profissional de alta performance para Tracking, Métricas de Lucro Real e Gestão de Campanhas Meta Ads (uma fusão entre UTMify e Facebook Ads Manager).

---

## 🏛️ Diferenciais de Engenharia
- **Backend em Python Puro**: Zero dependências PIP externas (`pip install` desnecessário). Inicialização em menos de 1 segundo.
- **Concorrência**: Servidor multi-threaded com `ThreadingHTTPServer` e SQLite em modo WAL.
- **Frontend SPA Reativo Dark Mode**: Interface fluida em Tailwind CSS e Lucide Icons.
- **Métricas de Lucro Real Estilo UTMify**: Faturamento Bruto, Faturamento Líquido, Lucro Real, ROAS Real, CPA Real, Vendas Aprovadas vs. Pendentes.
- **Funil Ribbon Contínuo**: CLIQUES ➔ VIS. PÁGINA (Connect Rate) ➔ ICS ➔ VENDAS INIC. ➔ VENDAS APR.
- **Gerenciador de Anúncios Profissional**: Réplica do Facebook Ads Manager com sub-abas (*Campanhas*, *Conjuntos*, *Anúncios*), filtro hierárquico, ações em massa e customização de colunas.
- **Meta Conversions API (CAPI Server-Side)**: Disparo server-side de compras para Meta com criptografia SHA-256 e cookies `_fbp`/`_fbc`.
- **Motor de Regras Automáticas**: Stop Loss e Escala com verificação em background a cada 60 segundos.

---

## 📊 Contas e Campanhas Sincronizadas no Sistema

| Conta de Anúncios | ID da Conta | Moeda | Status | Gasto Histórico |
| :--- | :--- | :--- | :--- | :--- |
| **Deslumbre G1** | `act_1670255660603213` | BRL | Ativa | R$ 114,35 |
| **BM02D** | `act_2118282965442535` | BRL | Ativa | R$ 28,12 |

### Campanhas Ativas/Importadas:
- `ADS01` (ID: 120251708995320561)
- `ADsandalias` (ID: 120249190200080470)
- `ADursinhobb` (ID: 120249181068750470)
- `escova rotativa` (ID: 120249142007030470)
- `AD01mamães` (ID: 120249111307080470)
- `Reconhecimento pagina Des` (ID: 120235224813130470)

---

## 💻 Como Iniciar Localmente

Basta dar **dois cliques** no arquivo:
👉 `iniciar.bat`

Ou via terminal:
```bash
python server.py 8000
```
Acesse no seu navegador: **[http://localhost:8000](http://localhost:8000)**

---

## ☁️ Deploy Gratuito no Render

1. Crie o repositório no GitHub com os arquivos desta pasta.
2. No Render (**dashboard.render.com**), crie um **Web Service**.
3. **Build Command**: (deixar vazio)
4. **Start Command**:
   ```bash
   python server.py 10000
   ```
5. **Instance Type**: Free.

---

## 🔌 Webhooks Prontos para Cadastrar

| Plataforma | Endpoint no NexusTrack |
| :--- | :--- |
| **Kiwify** | `https://SEU-DOMINIO/api/webhook/kiwify` |
| **Hotmart** | `https://SEU-DOMINIO/api/webhook/hotmart` |
| **Greenn** | `https://SEU-DOMINIO/api/webhook/greenn` |
| **Cakto** | `https://SEU-DOMINIO/api/webhook/cakto` |
| **Wiapy** | `https://SEU-DOMINIO/api/webhook/wiapy` |

---

## ⚡ Script de Tracking nas Páginas de Vendas (`nexustrack.js`)

Cole no `<head>` das suas páginas de vendas, VSL e checkout:
```html
<script src="https://SEU-DOMINIO/nexustrack.js" defer></script>
```
Este script captura automaticamente as UTMs, cria os cookies Meta CAPI (`_fbp` e `_fbc`) e injeta os parâmetros de rastreamento em todos os links e botões de compra.
