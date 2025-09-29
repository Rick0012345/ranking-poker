# Integração com Supabase - Sistema de Ranking de Poker

## Configuração Realizada

### 1. Cliente Supabase
- Adicionado script do Supabase via CDN no `index.html`
- Configuração do cliente no `script.js` com URL do projeto
- Sistema de fallback para localStorage caso o Supabase não esteja disponível

### 2. Estrutura do Banco de Dados
Criadas as seguintes tabelas no PostgreSQL:

#### Tabela `players`
- `id`: UUID (chave primária)
- `name`: VARCHAR(255) UNIQUE (nome do jogador)
- `points`: INTEGER (pontos totais)
- `games_played`: INTEGER (jogos jogados)
- `wins`: INTEGER (vitórias)
- `created_at`, `updated_at`: TIMESTAMP

#### Tabela `game_history`
- `id`: UUID (chave primária)
- `player_name`: VARCHAR(255) (nome do jogador)
- `position`: INTEGER (posição no jogo)
- `points`: INTEGER (pontos ganhos)
- `game_date`: TIMESTAMP (data do jogo)

#### Tabela `weekly_winners`
- `id`: UUID (chave primária)
- `week_number`: INTEGER (número da semana)
- `year`: INTEGER (ano)
- `winner_name`: VARCHAR(255) (nome do ganhador)
- `points`: INTEGER (pontos do ganhador)

### 3. Funcionalidades Implementadas

#### Carregamento de Dados
- `loadData()`: Função unificada que usa Supabase ou localStorage
- `loadSupabaseData()`: Carrega dados do banco PostgreSQL
- `loadLocalData()`: Fallback para dados locais

#### Salvamento de Dados
- `saveData()`: Função unificada que usa Supabase ou localStorage
- `saveSupabaseData()`: Salva dados no banco PostgreSQL
- `saveLocalData()`: Fallback para dados locais

#### Sistema de Fallback
- Se o Supabase não estiver disponível, o sistema automaticamente usa localStorage
- Mensagens informativas indicam qual fonte de dados está sendo usada

## Próximos Passos

### Para Ativar o Supabase:
1. Acesse o dashboard do Supabase: https://supabase.com/dashboard/project/ijnjllnszmsgbnpxrtaa
2. Vá em Settings > API
3. Copie a chave "anon/public"
4. Substitua no arquivo `script.js` na linha que contém `YOUR_REAL_ANON_KEY_HERE`

### Para Criar as Tabelas:
1. No dashboard do Supabase, vá em SQL Editor
2. Execute o conteúdo do arquivo `database-setup.sql`
3. Isso criará todas as tabelas necessárias com índices e políticas de segurança

### Configuração de Segurança:
- As políticas RLS (Row Level Security) estão habilitadas
- Atualmente configuradas para permitir acesso total (adequado para desenvolvimento)
- Em produção, considere restringir o acesso conforme necessário

## Estrutura de Arquivos
- `index.html`: Inclui o script do Supabase
- `script.js`: Lógica principal com integração Supabase/localStorage
- `database-setup.sql`: Script SQL para criar as tabelas
- `supabase-config.js`: Arquivo de configuração (para referência)
- `README-Supabase.md`: Esta documentação

## Status da Integração
✅ Cliente Supabase configurado
✅ Estrutura do banco definida
✅ Funções de carregamento implementadas
✅ Funções de salvamento implementadas
✅ Sistema de fallback funcionando
✅ Testes básicos realizados

O sistema está pronto para usar o Supabase assim que a chave anônima for configurada e as tabelas forem criadas no banco de dados.