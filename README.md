# Mastria AI

Aplicativo em português para registro de treinos, check-in, biblioteca educativa de exercícios, câmera e assistente de inteligência artificial.

## Desenvolvimento e publicação

O projeto mantém a interface em `index.html`. A função segura de IA está em `api/chat.js` e requer uma plataforma que execute funções de servidor, como a Vercel. A publicação estática pelo GitHub Pages, sozinha, não executa essa função.

1. Importe este repositório na Vercel.
2. Em **Configurações do projeto → Variáveis de ambiente**, crie `OPENAI_API_KEY` com sua chave secreta da API.
3. Opcionalmente, configure `OPENAI_MODEL` (padrão: `gpt-5.5`).
4. Publique novamente o projeto.
5. Abra o aplicativo e envie uma pergunta na área Assistente.

**Segurança:** nunca coloque a chave da API em `index.html`, em arquivos públicos ou no repositório. A chave deve existir somente como variável secreta do servidor. O endpoint limita as mensagens a 2.000 caracteres e solicita respostas sem armazenamento (`store: false`). O uso da API pode gerar custos na conta do provedor.

## Câmera

A câmera requer HTTPS e autorização explícita do usuário. O rastreamento corporal atual é experimental e não representa avaliação clínica. O vídeo não é gravado pelo aplicativo.

## Exercícios

A biblioteca contém 132 descrições educativas (32 anteriores e 100 novas). Ela não constitui prescrição de reabilitação ou substitui avaliação individual.

## Testes

Execute `npm test` para verificar estrutura, sintaxe dos scripts, biblioteca e validações.
