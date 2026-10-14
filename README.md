# ML Manager — Gerenciamento, Cópia, Armazenamento e Exportação de Anúncios do Mercado Livre

Sistema completo para importação integral de anúncios do Mercado Livre a partir de URL ou ID MLB, persistência local em banco de dados SQLite (`mercadolivre.db`), gerenciamento de variações, download de imagens, cópia rápida, histórico de alterações e exportação em múltiplos formatos (JSON, CSV, TXT e ZIP com fotos).

---

## 🚀 Funcionalidades Principais

1. **Importação Inteligente de Anúncios:**
   - Suporte a links diretos (`https://produto.mercadolivre.com.br/MLB-1234567890-...`) ou apenas o código (`MLB1234567890`).
   - Importação em lote sequencial com barra de progresso em tempo real e log de status.
   - Detecção automática de duplicidade com opções: *Atualizar Dados*, *Criar Nova Cópia* ou *Cancelar*.

2. **Captura Completa de Dados Oficiais:**
   - **Gerais:** ID MLB, Título, Subtítulo, Categoria, Preço, Preço promocional, Moeda, Condição, Estoque, Vendidos, Status, Tipo do anúncio, Permalink, Datas.
   - **Produto & Ficha Técnica:** SKU, Código interno, GTIN / EAN, ISBN, Marca, Modelo, Fabricante, Linha, Gênero, Material, Cor, Tamanho, etc.
   - **Atributos Dinâmicos:** Estrutura relacional flexível que armazena todos os atributos retornados pela API oficial.
   - **Variações:** Tabela detalhada de variações (Cor, Tamanho, SKU, Preço, Estoque, GTIN e atributos combinados).
   - **Descrição Formatada:** Preserva quebras de linha, listas e estrutura de texto original.
   - **Imagens:** Download e armazenamento local estruturado em `/dados/anuncios/{MLB}/imagens/` em alta resolução.
   - **JSON Bruto:** Armazenamento integral do payload retornado para evitar qualquer perda de informação.

3. **Gestão & Edição:**
   - **Duplicar Anúncio:** Cria uma nova cópia local independente para edição sem afetar o anúncio original.
   - **Atualização de Dados (Sync):** Reconsulta a API do Mercado Livre, calcula diferenças de preço, estoque e status, exibe modal de mudanças e registra na tabela `anuncio_historico`.
   - **Barra de Cópia Rápida:** Botões para copiar Título, Descrição, SKU, Link, JSON ou Dados Completos em 1 clique.

4. **Exportação Avançada:**
   - **ZIP Completo:** Contém `anuncio.json`, `anuncio.csv`, `descricao.txt`, pasta `/imagens/` com fotos locais, `variacoes.csv` e `atributos.csv`.
   - **CSV (Excel):** Exportação com codificação UTF-8 BOM para abertura perfeita no Microsoft Excel no Windows sem erros de acentos.
   - **Exportação em Lote:** Seleção múltipla via checkbox para exportar dezenas de anúncios em um único arquivo ZIP ou CSV unificado.

5. **Backup & Segurança:**
   - **Backup do Banco:** Gera cópias timestamped `mercadolivre_backup_YYYY-MM-DD_HH-mm.db`.
   - **Restauração:** Permite restaurar snapshots anteriores com backup prévio automático de segurança.
   - **Credenciais Seguras:** Suporte a `.env` e tela de configurações sem expor segredos no frontend.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express, TSX
- **Banco de Dados Local:** SQLite (`database/mercadolivre.db`) gerenciado via WebAssembly com índices de alta performance
- **Arquivos & Mídia:** Armazenamento local de imagens em `/dados/anuncios/{MLB}/imagens/`
- **Exportação:** JSZip e geradores de CSV com UTF-8 BOM

---

## 📂 Estrutura do Projeto

```
├── /database/
│   ├── db.ts                      # Conexão SQLite, migrations, índices e rotinas de backup
│   ├── seed.ts                    # Carga inicial com produtos demonstrativos
│   └── anunciosRepository.ts      # Consultas SQL, inserções, diff e histórico
│
├── /dados/
│   ├── anuncios/{MLB}/imagens/    # Imagens baixadas localmente organizadas por anúncio
│   └── backups/                   # Cópias de segurança do banco .db
│
├── /services/
│   ├── mercadolivre/
│   │   └── mlService.ts           # Integração com API oficial do Mercado Livre
│   └── export/
│       └── exportService.ts       # Gerador de JSON, CSV, TXT e pacotes ZIP
│
├── /src/
│   ├── components/                # Sidebar, Header, Modal, Toast
│   ├── context/                   # ToastContext, ThemeContext (Dark / Light)
│   ├── pages/
│   │   ├── Dashboard.tsx          # Indicadores, métricas e últimos anúncios
│   │   ├── Importar.tsx           # Tela de importação individual e em lote
│   │   ├── MeusAnuncios.tsx       # Tabela com busca, filtros e ações em lote
│   │   ├── DetalhesAnuncio.tsx    # 8 abas completas com edição, histórico e fotos
│   │   ├── Exportacoes.tsx        # Central de exportação de catálogos
│   │   └── Configuracoes.tsx      # Credenciais ML, backups e logs
│   ├── services/
│   │   └── api.ts                 # Cliente HTTP frontend
│   └── types/
│       └── index.ts               # Interfaces TypeScript
│
├── server.ts                      # Servidor Express Full-Stack com Vite middleware
└── package.json
```

---

## 💻 Como Executar Localmente

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar em ambiente de desenvolvimento
```bash
npm run dev
```
O aplicativo iniciará o backend Express e o frontend React juntos na porta `3000`:
Acesse: [http://localhost:3000](http://localhost:3000)

### 3. Configurar API do Mercado Livre (Opcional)
Por padrão, o aplicativo utiliza a **API pública oficial** do Mercado Livre (`https://api.mercadolibre.com`), que permite buscar qualquer anúncio ativo, suas variações, descrição e fotos sem necessidade de login.

Caso deseje utilizar uma aplicação registrada do Mercado Livre para limites maiores ou anúncios privados:
1. Acesse o painel de desenvolvedores: [Mercado Livre Developers](https://developers.mercadolivre.com.br)
2. Crie uma aplicação para obter seu `CLIENT_ID` e `CLIENT_SECRET`.
3. Insira as credenciais na aba **Configurações** da aplicação ou crie o arquivo `.env`:
   ```env
   CLIENT_ID="seu_client_id"
   CLIENT_SECRET="seu_client_secret"
   ACCESS_TOKEN="seu_access_token"
   ```

---

## 🗄️ Estrutura do Banco de Dados SQLite

O banco `mercadolivre.db` possui 7 tabelas normalizadas com relacionamentos via chave estrangeira e índices:

- `anuncios`: dados cadastrais, comerciais, códigos, dimensões e `raw_json`.
- `imagens`: URLs originais, URLs em alta resolução, ordem e caminho local no disco.
- `atributos`: pares atributo / valor flexíveis (sem limite de campos).
- `variacoes`: grade de variações (cores, tamanhos, estoques individuais e preços).
- `variacao_atributos`: combinações de atributos de cada variação.
- `anuncio_historico`: auditoria de mudanças com valor anterior, novo e timestamp.
- `configuracoes` & `logs`: preferências e auditoria do sistema.
